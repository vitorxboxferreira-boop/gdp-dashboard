import { beforeEach, describe, expect, it, vi } from "vitest";
import { PausedError, PermanentError, RetryableError } from "@core/errors.ts";
import { orchestratorTick, processJobs, runAnalyst, runScout, startManualCampaign } from "@core/pipeline.ts";
import type { PlaceResult } from "@core/places.ts";
import { MemoryRepo } from "./memory-repo";

function place(i: number, extra: Partial<PlaceResult> = {}): PlaceResult {
  return {
    id: `place-${i}`,
    displayName: { text: `Empresa ${i}` },
    formattedAddress: `Rua ${i}`,
    primaryType: "beauty_salon",
    internationalPhoneNumber: `+55 55 99999-${String(1000 + i).padStart(4, "0")}`,
    businessStatus: "OPERATIONAL",
    userRatingCount: 20,
    rating: 4.6,
    ...extra,
  };
}

/** Simula a Places API: cada consulta devolve páginas com 20 lugares. */
function fakePlaces(pagesPerQuery = 2, perPage = 20) {
  let counter = 0;
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    const page = body.pageToken ? Number(body.pageToken) : 1;
    const places = Array.from({ length: perPage }, () => place(++counter));
    return new Response(
      JSON.stringify({ places, nextPageToken: page < pagesPerQuery ? String(page + 1) : undefined }),
      { status: 200 },
    );
  });
}

let repo: MemoryRepo;
let clock: Date;
const deps = (extra = {}) => ({ repo, placesApiKey: "KEY", now: () => clock, ...extra });

beforeEach(() => {
  repo = new MemoryRepo();
  clock = new Date("2026-11-16T11:01:00Z"); // segunda-feira, 08:01 em São Paulo
  repo.now = () => clock;
  repo.areas = [{
    id: "area-1", city: "Sant'Ana do Livramento", state: "RS", country: "BR",
    latitude: -30.89, longitude: -55.53, radius_m: 8000,
    categories: ["salão de beleza", "padaria", "oficina"], category_cursor: 0,
  }];
});

describe("Agente Scout", () => {
  it("não chama a API se a integração estiver desativada ou sem chave", async () => {
    const fetchImpl = fakePlaces();
    repo.settings.places_enabled = false;
    expect((await runScout(deps({ fetchImpl }), { campaignId: null, jobId: null })).skipped).toBe("places_disabled");
    repo.settings.places_enabled = true;
    expect((await runScout(deps({ fetchImpl, placesApiKey: null }), { campaignId: null, jobId: null })).skipped).toBe("missing_api_key");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("respeita o limite diário de empresas e registra custos", async () => {
    const fetchImpl = fakePlaces(3);
    const stats = await runScout(deps({ fetchImpl }), { campaignId: "c1", jobId: "j1" });
    expect(stats.new_companies).toBe(50);
    expect(repo.companies).toHaveLength(50);
    expect(stats.requests).toBe(3); // 20 + 20 + 10 (limite)
    expect(repo.usage).toHaveLength(3);
    expect(repo.usage.every((u) => u.estimated_cost_usd === 0.035 && u.success)).toBe(true);
    // Segunda execução no mesmo dia: limite já atingido
    const again = await runScout(deps({ fetchImpl }), { campaignId: "c1", jobId: "j2" });
    expect(again.skipped).toBe("company_limit_reached");
  });

  it("respeita o limite diário de requisições e avança o cursor de categorias", async () => {
    repo.settings.places_daily_request_limit = 2;
    const fetchImpl = fakePlaces(1, 5);
    const stats = await runScout(deps({ fetchImpl }), { campaignId: null, jobId: null });
    expect(stats.requests).toBe(2);
    expect(stats.queries).toEqual(["salão de beleza em Sant'Ana do Livramento, RS", "padaria em Sant'Ana do Livramento, RS"]);
    expect(repo.areas[0].category_cursor).toBe(2);
    expect((await runScout(deps({ fetchImpl }), { campaignId: null, jobId: null })).skipped).toBe("request_limit_reached");
  });

  it("deduplica por Place ID e por telefone", async () => {
    const same = vi.fn(async () =>
      new Response(JSON.stringify({ places: [place(1), place(1), place(2, { id: "other-id", internationalPhoneNumber: "+55 55 99999-1001" })] }), { status: 200 }),
    );
    repo.settings.places_daily_request_limit = 1;
    const stats = await runScout(deps({ fetchImpl: same }), { campaignId: null, jobId: null });
    expect(stats.new_companies).toBe(1);
    expect(stats.duplicates).toBe(2);
  });

  it("classifica erros da API para a fila", async () => {
    const bad = vi.fn(async () => new Response(JSON.stringify({ error: { message: "invalid key" } }), { status: 403 }));
    await expect(runScout(deps({ fetchImpl: bad }), { campaignId: null, jobId: null })).rejects.toBeInstanceOf(PermanentError);
    const down = vi.fn(async () => new Response("{}", { status: 503 }));
    await expect(runScout(deps({ fetchImpl: down }), { campaignId: null, jobId: null })).rejects.toBeInstanceOf(RetryableError);
    expect(repo.usage.filter((u) => !u.success)).toHaveLength(2);
  });

  it("interrompe imediatamente na parada de emergência", async () => {
    const fetchImpl = vi.fn(async () => {
      repo.settings.automation_paused = true; // pausa durante a execução
      return new Response(JSON.stringify({ places: [place(1)], nextPageToken: "2" }), { status: 200 });
    });
    await expect(runScout(deps({ fetchImpl }), { campaignId: null, jobId: null })).rejects.toBeInstanceOf(PausedError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("Agente Analyst", () => {
  it("pontua todas as empresas pendentes e não repontua sem mudanças", async () => {
    await runScout(deps({ fetchImpl: fakePlaces(1, 10) }), { campaignId: null, jobId: null });
    const res = await runAnalyst(deps());
    expect(res.scored).toBeGreaterThanOrEqual(10);
    expect(res.by_priority.alta).toBeGreaterThan(0);
    expect((await runAnalyst(deps())).scored).toBe(0);
  });
});

describe("Orquestrador da campanha diária", () => {
  it("cria uma única campanha por dia e executa as etapas na ordem e no horário", async () => {
    const fetchImpl = fakePlaces(1, 10);
    const t1 = await orchestratorTick(deps({ fetchImpl }), { worker: "w" });
    expect(t1.campaign?.created).toBe(true);
    expect(repo.jobs).toHaveLength(7);
    expect(t1.processed.map((p) => p.kind)).toEqual(["campaign.start"]);

    const t2 = await orchestratorTick(deps({ fetchImpl }), { worker: "w" });
    expect(t2.campaign?.created).toBe(false);
    expect(repo.campaigns).toHaveLength(1);

    clock = new Date("2026-11-16T11:41:00Z"); // 08:41
    const t3 = await orchestratorTick(deps({ fetchImpl }), { worker: "w" });
    expect(t3.processed.map((p) => `${p.kind}:${p.outcome}`)).toEqual([
      "scout.search:done", "analyst.score:done", "leads.classify:done", "eligibility.check:done",
    ]);
    expect(repo.companies.length).toBe(30); // 3 categorias × 10 resultados

    clock = new Date("2026-11-16T15:01:00Z"); // 12:01
    const t4 = await orchestratorTick(deps({ fetchImpl }), { worker: "w" });
    expect(t4.processed.map((p) => p.kind)).toEqual(["report.prepare", "report.publish"]);
    expect(repo.reports.get("2026-11-16")?.status).toBe("disponivel");
    expect(repo.campaigns[0].status).toBe("concluida");
    expect(repo.campaigns[0].stats).toHaveProperty("scout");
  });

  it("não cria campanha em feriado, fim de semana, fora da janela ou sem piloto automático", async () => {
    clock = new Date("2026-11-20T11:05:00Z"); // feriado
    expect((await orchestratorTick(deps(), { worker: "w" })).campaign).toBeUndefined();
    clock = new Date("2026-11-21T11:05:00Z"); // sábado
    expect((await orchestratorTick(deps(), { worker: "w" })).campaign).toBeUndefined();
    clock = new Date("2026-11-16T16:00:00Z"); // 13:00
    expect((await orchestratorTick(deps(), { worker: "w" })).campaign).toBeUndefined();
    clock = new Date("2026-11-16T11:05:00Z");
    repo.settings.autopilot_enabled = false;
    expect((await orchestratorTick(deps(), { worker: "w" })).campaign).toBeUndefined();
    expect(repo.campaigns).toHaveLength(0);
  });

  it("pausado: não cria campanha nem processa tarefas", async () => {
    repo.settings.automation_paused = true;
    const r = await orchestratorTick(deps(), { worker: "w" });
    expect(r.paused).toBe(true);
    expect(repo.campaigns).toHaveLength(0);
  });

  it("falha temporária volta para a fila e o relatório registra a etapa", async () => {
    const down = vi.fn(async () => new Response("{}", { status: 503 }));
    await orchestratorTick(deps({ fetchImpl: down }), { worker: "w" });
    clock = new Date("2026-11-16T11:41:00Z");
    const r = await orchestratorTick(deps({ fetchImpl: down }), { worker: "w" });
    expect(r.processed[0]).toMatchObject({ kind: "scout.search", outcome: "queued" });
    expect(repo.jobs.find((j) => j.kind === "scout.search")?.attempts).toBe(1);
  });
});

describe("Campanha manual", () => {
  it("executa pesquisa, análise, classificação e elegibilidade imediatamente", async () => {
    const campaign = await startManualCampaign(deps(), "user-1");
    const processed = await processJobs(deps({ fetchImpl: fakePlaces(1, 5) }), { worker: "manual" });
    expect(processed.map((p) => p.outcome)).toEqual(["done", "done", "done", "done", "done"]);
    expect(repo.campaigns.find((c) => c.id === campaign.id)?.status).toBe("concluida");
  });
});
