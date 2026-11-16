"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ok, optStr, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

// Etapas que dependem de conversa/IA (Fases 2–4) não são definidas manualmente aqui.
const MANUAL_STAGES = ["novo", "qualificado", "perdido", "descartado"] as const;

export async function updateLeadStage(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const v = z
      .object({
        lead_id: z.string().uuid(),
        stage: z.enum(MANUAL_STAGES, { message: "Etapa inválida" }),
        lost_reason: z.string().max(500).nullable(),
      })
      .parse({ lead_id: str(fd, "lead_id"), stage: str(fd, "stage"), lost_reason: optStr(fd, "lost_reason") });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({ stage: v.stage, lost_reason: v.stage === "perdido" || v.stage === "descartado" ? v.lost_reason : null })
      .eq("id", v.lead_id);
    if (error) throw error;
    revalidatePath("/leads");
    revalidatePath("/empresas");
    return ok("Etapa atualizada.");
  } catch (e) {
    return toResult(e);
  }
}
