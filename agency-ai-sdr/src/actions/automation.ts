"use server";

import { revalidatePath } from "next/cache";
import { processJobs, runAnalyst, startManualCampaign, SKIP_LABELS } from "@core/pipeline.ts";
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
