"use server";

import { revalidatePath } from "next/cache";
import { prepareReport } from "@core/pipeline.ts";
import { zonedParts } from "@core/schedule.ts";
import { buildAgentDeps } from "@/lib/agent-deps";
import { requireActionRole } from "@/lib/auth";
import { ok, toResult } from "./helpers";
import type { ActionResult } from "./types";

/** Gera (ou atualiza) o relatório de hoje e o disponibiliza. */
export async function generateReportNow(_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const deps = buildAgentDeps();
    const date = zonedParts(new Date(), "America/Sao_Paulo").date;
    await prepareReport(deps, null, date);
    await deps.repo.upsertDailyReport({ report_date: date, campaign_id: null, status: "disponivel" });
    revalidatePath("/relatorios");
    return ok("Relatório de hoje gerado.");
  } catch (e) {
    return toResult(e);
  }
}
