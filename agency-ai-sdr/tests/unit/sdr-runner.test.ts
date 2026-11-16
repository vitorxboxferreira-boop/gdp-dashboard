import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentLlm, LlmResult } from "@core/anthropic-llm.ts";
import { DeferError, PermanentError, RetryableError } from "@core/errors.ts";
import { processJobs } from "@core/pipeline.ts";
import type { AgentContext, AgentDecisionInput, AgentRepo } from "@core/repo.ts";
import type { AgentDecision, ChatMessage } from "@core/sdr-agent.ts";
import { HANDOFF_MESSAGE } from "@core/sdr-agent.ts";
import { runSdrReply } from "@core/sdr-runner.ts";
import { MemoryRepo } from "./memory-repo";

class MemoryAgentRepo extends MemoryRepo implements AgentRepo {
  ctx: AgentContext;
  gate = { allowed: true, reasons: [] as string[] };
  tokens = 0;
  outbound: Array<{ id: string; body: string; key: string; status: string; wamid?: string | null; metadata?: Record<string, unknown> }> = [];
  decisions: AgentDecisionInput[] = [];
  optOuts: string[] = [];
  constructor(messages: ChatMessage[]) {
    super();
    this.ctx = {
      conversation: { id: "conv-1", phone_e164: "+5555999991234", wa_id: "555599991234", contact_name: "João", status: "aberta", handled_by: "agente", agent_paused: false, agent_role: "sdr", customer_summary: null, company_id: "co-1", lead_id: "lead-1" },
      messages,
      company: { name: "Oficina do João", category_label: "Oficina mecânica", website_status: "not_identified" },
      lead: { stage: "qualificado" },
      knowledge: [],
    };
    Object.assign(this.settings, {
      ai_enabled: true, ai_daily_token_limit: 100000, ai_effort: "low", ai_max_replies_per_conversation_day: 15,
      agent_hours_start: "08:00:00", agent_hours_end: "18:00:00", agent_days: [1, 2, 3, 4, 5], agency_name: "Agência X", assistant_name: "Lia",
      ai_cost_per_mtok_input_usd: 4, ai_cost_per_mtok_output_usd: 20,
      offer: { product_name: "Site", price_cents: 25000, currency: "BRL", includes: ["Página"], not_included: [], max_discount_percent: 0, payment_terms: "", delivery_time: "" },
    });
  }
  async getAgentContext() { return { ...this.ctx, messages: [...this.ctx.messages] }; }
  async sendCheck() { return this.gate; }
  async sumAiTokens() { return this.tokens; }
  async countAgentReplies() { return this.outbound.length; }
  async registerOutbound(_c: string, body: string, _s: string, key: string) {
    const ex = this.outbound.find((o) => o.key === key);
    if (ex) return { message_id: ex.id, duplicate: true, status: ex.status };
    const row = { id: `out-${this.outbound.length + 1}`, body, key, status: "pendente" };
    this.outbound.push(row);
    return { message_id: row.id, duplicate: false, status: "pendente" };
  }
  async completeOutbound(id: string, wamid: string | null, error: string | null, metadata?: Record<string, unknown>) {
    const o = this.outbound.find((x) => x.id === id)!;
    Object.assign(o, { status: error ? "falhou" : "enviada", wamid, metadata });
  }
  async applyAgentDecision(d: AgentDecisionInput) { this.decisions.push(d); }
  async agentOptOut(conversationId: string) { this.optOuts.push(conversationId); }
  busy: Array<{ starts_at: string; ends_at: string; status: string }> = [];
  meetings: Array<{ conversationId: string; startsAt: string }> = [];
  failMeeting = false;
  async busyMeetingRanges() { return this.busy; }
  async requestMeeting(conversationId: string, startsAt: string) {
    if (this.failMeeting) throw new Error("horário indisponível");
    this.meetings.push({ conversationId, startsAt });
    return "appt-1";
  }
}

const msg = (direction: "inbound" | "outbound", body: string, wamid: string | null, sender: ChatMessage["sender"] = direction === "inbound" ? "cliente" : "agente"): ChatMessage =>
  ({ direction, sender, body, message_type: "text", wa_message_id: wamid, created_at: "" });

const decision = (over: Partial<AgentDecision> = {}): AgentDecision => ({
  reply: "Olá! Sou o assistente virtual da Agência X. Sua empresa já tem site?", intent: "saudacao", next_stage: "sem_mudanca",
  handoff_to_human: false, handoff_reason: "", register_opportunity: false, customer_summary: "Dono de oficina, quer saber de sites.", meeting_slot: "", ...over,
});

function fakeLlm(d: AgentDecision | null, extra: Partial<LlmResult> = {}): AgentLlm & { decide: ReturnType<typeof vi.fn> } {
  return { decide: vi.fn(async () => ({ decision: d, refused: false, stopReason: "end_turn", model: "claude-opus-5-5", usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, ...extra })) };
}
function fakeWhatsApp(status = 200) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(status === 200 ? { messages: [{ id: "wamid.OUT" }] } : { error: { message: "fail", code: 1 } }), { status }));
  return { config: { accessToken: "t", phoneNumberId: "p", graphVersion: "v23.0", fetchImpl }, fetchImpl };
}

let repo: MemoryAgentRepo;
const monday10h = () => new Date("2026-11-16T13:00:00Z"); // segunda, 10:00 em São Paulo
const job = { id: "job-1", payload: { conversation_id: "conv-1", wamid: "wamid.IN2" } };

beforeEach(() => {
  repo = new MemoryAgentRepo([msg("inbound", "Oi", "wamid.IN1"), msg("inbound", "Quanto custa um site?", "wamid.IN2")]);
});

describe("agente SDR/Closer — execução", () => {
  it("responde, registra custo e decisão", async () => {
    const llm = fakeLlm(decision({ intent: "pediu_preco", reply: "Olá! Sou o assistente virtual da Agência X. O site custa R$ 250,00." }));
    const wa = fakeWhatsApp();
    const res = await runSdrReply({ repo, llm, whatsapp: wa.config, now: monday10h }, job);
    expect(res).toMatchObject({ outcome: "replied", intent: "pediu_preco", role: "closer" });
    expect(repo.outbound[0]).toMatchObject({ body: "Olá! Sou o assistente virtual da Agência X. O site custa R$ 250,00.", status: "enviada", key: "agent:wamid.IN2" });
    expect(JSON.parse(String((wa.fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body)).to).toBe("555599991234");
    expect(repo.usage[0]).toMatchObject({ provider: "anthropic", input_tokens: 100, output_tokens: 50, estimated_cost_usd: 0.0014 });
    expect(repo.decisions[0]).toMatchObject({ handoff: false, agentRole: "closer", summary: "Dono de oficina, quer saber de sites." });
    // a IA recebeu o histórico agrupado e o contexto da empresa
    const call = llm.decide.mock.calls[0][0];
    expect(call.turns).toEqual([{ role: "user", content: "Oi\nQuanto custa um site?" }]);
    expect(call.contextPrompt).toContain("Oficina do João");
    expect(call.stablePrompt).toContain("R$ 250,00");
  });

  it("só a mensagem mais recente gera resposta; não responde duas vezes", async () => {
    const llm = fakeLlm(decision());
    expect(await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, { ...job, payload: { ...job.payload, wamid: "wamid.IN1" } })).toMatchObject({ outcome: "skipped" });
    repo.ctx.messages.push(msg("outbound", "resposta", null));
    expect(await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job)).toMatchObject({ outcome: "skipped", reason: "já respondida" });
    expect(llm.decide).not.toHaveBeenCalled();
  });

  it("fora do horário: reagenda sem chamar a IA", async () => {
    const llm = fakeLlm(decision());
    await expect(runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: () => new Date("2026-11-16T23:00:00Z") }, job)).rejects.toBeInstanceOf(DeferError);
    expect(llm.decide).not.toHaveBeenCalled();
  });

  it("bloqueado pela verificação de envio: não gasta com IA", async () => {
    repo.gate = { allowed: false, reasons: ["Modo de teste ativo: número fora da lista de testes"] };
    const llm = fakeLlm(decision());
    expect(await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job)).toMatchObject({ outcome: "skipped" });
    expect(llm.decide).not.toHaveBeenCalled();
    expect(repo.outbound).toHaveLength(0);
  });

  it("limite diário de tokens: transfere para humano sem chamar a IA", async () => {
    repo.tokens = 100000;
    const llm = fakeLlm(decision());
    expect(await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job)).toMatchObject({ outcome: "handoff" });
    expect(llm.decide).not.toHaveBeenCalled();
    expect(repo.outbound[0].body).toBe(HANDOFF_MESSAGE);
    expect(repo.decisions[0]).toMatchObject({ handoff: true });
    expect(repo.limitAlerts).toEqual(["ai_tokens"]);
  });

  it("resposta que viola as travas não é enviada; equipe assume", async () => {
    const llm = fakeLlm(decision({ reply: "Faço por R$ 150,00 e o domínio é grátis!" }));
    const res = await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(res).toMatchObject({ outcome: "handoff" });
    expect(res).toHaveProperty("violations", expect.arrayContaining(["promessa de domínio/hospedagem grátis"]));
    expect(repo.outbound[0].body).toBe(HANDOFF_MESSAGE);
    expect(repo.outbound[0].metadata).toMatchObject({ blocked_reply: "Faço por R$ 150,00 e o domínio é grátis!" });
    expect(repo.decisions[0].handoffReason).toMatch(/bloqueada pelas travas/);
  });

  it("primeira mensagem sem identificação: o código adiciona", async () => {
    const llm = fakeLlm(decision({ reply: "Oi João! Sua empresa já tem site?" }));
    await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(repo.outbound[0].body).toMatch(/^Olá! Sou o assistente virtual da Agência X/);
  });

  it("intenção de contratar: registra oportunidade para aprovação humana", async () => {
    const llm = fakeLlm(decision({ intent: "quer_contratar", register_opportunity: true, next_stage: "proposta", reply: "Ótimo! Uma pessoa da equipe vai confirmar os detalhes com você." }));
    const res = await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(res).toMatchObject({ outcome: "handoff" });
    expect(repo.decisions[0]).toMatchObject({ opportunity: true, amountCents: 25000, handoff: true, nextStage: "proposta" });
  });

  it("descadastro identificado pela IA: bloqueia e não responde", async () => {
    const llm = fakeLlm(decision({ intent: "descadastro", reply: "" }));
    expect(await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job)).toMatchObject({ outcome: "opt_out" });
    expect(repo.optOuts).toEqual(["conv-1"]);
    expect(repo.outbound).toHaveLength(0);
  });

  it("recusa do modelo: equipe assume", async () => {
    const llm = fakeLlm(null, { refused: true, stopReason: "refusal" });
    expect(await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job)).toMatchObject({ outcome: "handoff" });
  });

  it("falha temporária no WhatsApp: repete e reenvia a MESMA mensagem uma vez", async () => {
    const llm = fakeLlm(decision());
    await expect(runSdrReply({ repo, llm, whatsapp: fakeWhatsApp(503).config, now: monday10h }, job)).rejects.toBeInstanceOf(RetryableError);
    expect(repo.outbound[0].status).toBe("pendente");
    await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(repo.outbound).toHaveLength(1);
    expect(repo.outbound[0].status).toBe("enviada");
  });

  it("oferece horários livres e registra o pedido escolhido (sem confirmar)", async () => {
    Object.assign(repo.settings, { meeting_days: [1, 2, 3, 4, 5], meeting_start: "09:00", meeting_end: "17:00", meeting_duration_min: 30, meeting_buffer_min: 15, meeting_max_per_day: 4, meeting_min_notice_hours: 4, meeting_horizon_days: 10, meeting_location: "Videochamada" });
    const llm = fakeLlm(decision({ intent: "quer_reuniao", meeting_slot: "H1", reply: "Perfeito! Anotei terça às 09:00; a equipe vai confirmar o horário com você." }));
    const res = await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(res).toMatchObject({ outcome: "replied" });
    const ctxPrompt = llm.decide.mock.calls[0][0].contextPrompt as string;
    expect(ctxPrompt).toMatch(/H1: (segunda|terça)/);
    expect(repo.meetings).toHaveLength(1);
    // segunda 10:00 + 4h de antecedência; grade de 45 min (30 + 15) a partir das 09:00 → 14:15 (17:15 UTC)
    expect(repo.meetings[0].startsAt).toBe("2026-11-16T17:15:00.000Z");
    expect(repo.outbound[0].metadata).toMatchObject({ meeting_slot: "H1", meeting_requested: expect.stringContaining("16/11 às 14:15") });
  });

  it("código de horário inexistente é ignorado; horário que ficou ocupado → equipe assume", async () => {
    const llm = fakeLlm(decision({ intent: "quer_reuniao", meeting_slot: "H99" }));
    await runSdrReply({ repo, llm, whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(repo.meetings).toHaveLength(0);
    repo = new MemoryAgentRepo([msg("inbound", "Pode ser o primeiro horário", "wamid.IN2")]);
    repo.failMeeting = true;
    await runSdrReply({ repo, llm: fakeLlm(decision({ intent: "quer_reuniao", meeting_slot: "H1" })), whatsapp: fakeWhatsApp().config, now: monday10h }, job);
    expect(repo.decisions[0]).toMatchObject({ handoff: true, handoffReason: expect.stringMatching(/indisponível/) });
  });

  it("sem chave da IA: erro definitivo", async () => {
    await expect(runSdrReply({ repo, llm: null, whatsapp: fakeWhatsApp().config, now: monday10h }, job)).rejects.toBeInstanceOf(PermanentError);
  });

  it("pela fila: tarefa definitivamente falha → conversa vai para humano", async () => {
    await repo.enqueueJobs([{ kind: "sdr.reply", payload: job.payload, campaign_id: null, run_after: "2026-01-01T00:00:00Z", idempotency_key: "sdr:wamid.IN2" }]);
    repo.now = monday10h;
    const out = await processJobs({ repo, llm: null, whatsapp: fakeWhatsApp().config, now: monday10h }, { worker: "w", kinds: ["sdr.reply"] });
    expect(out[0]).toMatchObject({ kind: "sdr.reply", outcome: "dead" });
    expect(repo.decisions[0]).toMatchObject({ handoff: true });
  });
});
