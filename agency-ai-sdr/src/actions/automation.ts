"use server";

import { revalidatePath } from "next/cache";
import { processJobs, runAnalyst, startManualCampaign, SKIP_LABELS } from "@core/pipeline.ts";
import { PLACES_FIELD_MASK, PLACES_TEXT_SEARCH_URL } from "@core/places.ts";
import { SupabaseRepo } from "@core/supabase-repo.ts";
import { requireActionRole } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

export async function pauseAutomation(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("set_automation_paused", {
      p_paused: true,
      p_reason: str(fd, "reason") || "Parada de emergência acionada no painel",
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return ok("Todas as automações foram interrompidas e as tarefas pendentes canceladas.");
  } catch (e) {
    return toResult(e);
  }
}

export async function resumeAutomation(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    if (str(fd, "confirm") !== "RETOMAR") return fail('Digite RETOMAR para confirmar.');
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("set_automation_paused", { p_paused: false, p_reason: null });
    if (error) throw error;
    revalidatePath("/", "layout");
    return ok("Automações retomadas.");
  } catch (e) {
    return toResult(e);
  }
}

function agentDeps() {
  const repo = new SupabaseRepo(createSupabaseAdminClient());
  return { repo, placesApiKey: serverEnv.googlePlacesApiKey, log: (m: string, d?: Record<string, unknown>) => console.log(m, d ?? {}) };
}

/** Executa agora: pesquisa (Scout) → análise (Analyst) → classificação → elegibilidade. */
export async function runManualSearch(_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    if (!serverEnv.supabaseServiceRoleKey) return fail("Configure SUPABASE_SECRET_KEY no servidor para executar os agentes.");
    const deps = agentDeps();
    const settings = await deps.repo.getSettings();
    if (settings.automation_paused) return fail("Automações pausadas. Um administrador precisa retomá-las.");

    const campaign = await startManualCampaign(deps, profile.id);
    const processed = await processJobs(deps, { worker: `panel-${profile.id.slice(0, 8)}`, maxJobs: 10, timeBudgetMs: 50_000 });
    revalidatePath("/", "layout");

    const updated = await deps.repo.getCampaign(campaign.id);
    const scout = (updated?.stats?.scout ?? {}) as { skipped?: string; new_companies?: number; requests?: number; duplicates?: number };
    const analyst = (updated?.stats?.analyst ?? {}) as { scored?: number };
    const failed = processed.filter((p) => p.outcome !== "done" && p.outcome !== "deferred");
    if (failed.length) {
      return fail(`Execução com falhas: ${failed.map((f) => `${f.kind}: ${f.detail ?? f.outcome}`).join("; ")}`);
    }
    const parts = [
      scout.skipped
        ? `Pesquisa não executada (${SKIP_LABELS[scout.skipped] ?? scout.skipped})`
        : `Pesquisa: ${scout.new_companies ?? 0} novas empresas, ${scout.duplicates ?? 0} já conhecidas, ${scout.requests ?? 0} requisições`,
      `Análise: ${analyst.scored ?? 0} empresas pontuadas`,
    ];
    return { ok: !scout.skipped, message: parts.join(". ") + "." };
  } catch (e) {
    return toResult(e);
  }
}

/** Reprocessa a pontuação e elegibilidade sem chamar APIs externas. */
export async function runAnalysisNow(_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    if (!serverEnv.supabaseServiceRoleKey) return fail("Configure SUPABASE_SECRET_KEY no servidor para executar os agentes.");
    const deps = agentDeps();
    const res = await runAnalyst(deps);
    const cls = await deps.repo.classifyLeads();
    await deps.repo.refreshEligibility();
    revalidatePath("/", "layout");
    return ok(`${res.scored} empresas pontuadas; ${cls.qualified ?? 0} leads qualificados. Elegibilidade atualizada.`);
  } catch (e) {
    return toResult(e);
  }
}

/**
 * Diagnóstico do Google Places: faz 2 chamadas mínimas (1 resultado) e mostra a resposta
 * COMPLETA do Google (sem a chave), para identificar recusas de permissão/faturamento.
 */
export async function diagnosePlaces(_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const key = serverEnv.googlePlacesApiKey;
    if (!key) return fail("GOOGLE_PLACES_API_KEY não está definida no servidor (Vercel) — adicione e faça Redeploy.");
    const call = async (label: string, mask: string) => {
      try {
        const res = await fetch(PLACES_TEXT_SEARCH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask },
          body: JSON.stringify({ textQuery: "padaria em Sant'Ana do Livramento, RS", languageCode: "pt-BR", regionCode: "BR", pageSize: 1 }),
          signal: AbortSignal.timeout(15000),
        });
        const text = (await res.text()).replace(/\s+/g, " ").slice(0, 900);
        return `${label}: HTTP ${res.status} ${res.ok ? "(OK)" : ""} ${text}`;
      } catch (err) {
        return `${label}: falha de rede (${(err as Error).message})`;
      }
    };
    const a = await call("Teste 1 (campos mínimos)", "places.id,places.displayName");
    const b = await call("Teste 2 (campos completos)", PLACES_FIELD_MASK);
    // Teste 3: API antiga (legacy) — só para diagnóstico, pois costuma explicar melhor a recusa.
    let c: string;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent("padaria em Sant'Ana do Livramento")}&language=pt-BR&key=${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const j = (await res.json()) as { status?: string; error_message?: string; results?: unknown[] };
      c = `Teste 3 (API antiga, só diagnóstico): HTTP ${res.status} status=${j.status ?? "?"} resultados=${j.results?.length ?? 0} mensagem=${j.error_message ?? "(nenhuma)"}`;
    } catch (err) {
      c = `Teste 3 (API antiga): falha de rede (${(err as Error).message})`;
    }
    const okAll = a.includes("(OK)") && b.includes("(OK)");
    return { ok: okAll, message: [a, b, c].join("\n\n") };
  } catch (e) {
    return toResult(e);
  }
}
