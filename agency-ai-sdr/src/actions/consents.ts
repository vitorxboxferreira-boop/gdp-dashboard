"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeBrPhone } from "@core/phone.ts";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, optStr, spLocalToIso, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

const SOURCES = ["mensagem_recebida", "formulario_site", "presencial", "telefone", "outro"] as const;

async function refreshCompanyEligibility(companyId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: lead } = await supabase.from("leads").select("id").eq("company_id", companyId).maybeSingle();
  if (lead) await supabase.rpc("refresh_lead_eligibility", { p_lead_id: lead.id });
}

export async function registerConsent(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const v = z
      .object({
        company_id: z.string().uuid(),
        source: z.enum(SOURCES, { message: "Origem inválida" }),
        evidence: z.string().min(10, "Descreva a evidência da autorização (mín. 10 caracteres)").max(2000),
        confirm: z.literal("on", { message: "Confirme que a autorização foi concedida pelo titular do número" }),
      })
      .parse({
        company_id: str(fd, "company_id"),
        source: str(fd, "source"),
        evidence: str(fd, "evidence"),
        confirm: str(fd, "confirm"),
      });
    const phone = normalizeBrPhone(str(fd, "phone"));
    if (!phone) return fail("Telefone inválido.");
    const granted = spLocalToIso(str(fd, "granted_at"));
    if (!granted) return fail("Informe data e hora da autorização.");
    const expiresRaw = optStr(fd, "expires_at");
    const expires = expiresRaw ? spLocalToIso(expiresRaw) : null;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("consents").insert({
      company_id: v.company_id,
      phone_e164: phone,
      source: v.source,
      evidence: v.evidence,
      granted_at: granted,
      expires_at: expires,
    });
    if (error) throw error;
    await refreshCompanyEligibility(v.company_id);
    revalidatePath(`/empresas/${v.company_id}`);
    return ok("Autorização registrada. Elegibilidade atualizada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function revokeConsent(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const id = z.string().uuid().parse(str(fd, "consent_id"));
    const companyId = z.string().uuid().parse(str(fd, "company_id"));
    const reason = str(fd, "reason") || "Revogada manualmente";
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("consents")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("id", id)
      .is("revoked_at", null);
    if (error) throw error;
    await refreshCompanyEligibility(companyId);
    revalidatePath(`/empresas/${companyId}`);
    return ok("Autorização revogada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function suppressPhone(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    const phone = normalizeBrPhone(str(fd, "phone"));
    if (!phone) return fail("Telefone inválido.");
    const reason = z.string().min(3, "Informe o motivo").max(500).parse(str(fd, "reason"));
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("suppression_list")
      .insert({ phone_e164: phone, reason, source: str(fd, "source") === "complaint" ? "complaint" : "manual", created_by: profile.id });
    if (error) throw error;
    revalidatePath("/", "layout");
    return ok("Telefone bloqueado. Autorizações revogadas e leads marcados como bloqueados.");
  } catch (e) {
    return toResult(e);
  }
}

export async function removeSuppression(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const id = z.string().uuid().parse(str(fd, "id"));
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("suppression_list").delete().eq("id", id);
    if (error) throw error;
    // Recalcula elegibilidade (continuará sem autorização até nova autorização ser registrada).
    await supabase.rpc("refresh_all_lead_eligibility");
    revalidatePath("/", "layout");
    return ok("Bloqueio removido. Uma nova autorização é necessária para qualquer contato.");
  } catch (e) {
    return toResult(e);
  }
}
