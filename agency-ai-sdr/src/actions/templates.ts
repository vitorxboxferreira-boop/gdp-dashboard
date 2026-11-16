"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAsTeam } from "@/lib/whatsapp-send";
import { bool, fail, ok, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

export async function saveTemplate(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const id = str(fd, "id");
    const v = z.object({
      name: z.string().regex(/^[a-z0-9_]{1,512}$/, "Nome exatamente como na Meta (minúsculas, números e _)"),
      language: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Idioma, ex.: pt_BR"),
      category: z.enum(["marketing", "utility"]),
      body_preview: z.string().min(10, "Cole o texto do template").max(1024),
      approved_confirmed: z.boolean(),
      active: z.boolean(),
    }).parse({
      name: str(fd, "name"), language: str(fd, "language") || "pt_BR", category: str(fd, "category"),
      body_preview: str(fd, "body_preview"), approved_confirmed: bool(fd, "approved_confirmed"), active: id ? bool(fd, "active") : true,
    });
    const params = new Set([...v.body_preview.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
    const param_count = params.size ? Math.max(...params) : 0;
    const supabase = await createSupabaseServerClient();
    const { error } = id
      ? await supabase.from("whatsapp_templates").update({ ...v, param_count }).eq("id", z.string().uuid().parse(id))
      : await supabase.from("whatsapp_templates").insert({ ...v, param_count, created_by: profile.id });
    if (error) throw error;
    revalidatePath("/configuracoes");
    return ok("Template salvo.");
  } catch (e) {
    return toResult(e);
  }
}

/** Inicia conversa com template aprovado — somente contatos com autorização válida (verificado no banco). */
export async function sendTemplateToCompany(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    const companyId = z.string().uuid().parse(str(fd, "company_id"));
    const templateId = z.string().uuid("Escolha um template").parse(str(fd, "template_id"));
    const idem = z.string().uuid().parse(str(fd, "idempotency_key"));
    const supabase = await createSupabaseServerClient();
    const { data: tpl } = await supabase.from("whatsapp_templates").select("*").eq("id", templateId).eq("active", true).maybeSingle();
    if (!tpl) return fail("Template não encontrado ou inativo.");
    if (!tpl.approved_confirmed) return fail("Template não marcado como aprovado pela Meta.");
    const params = Array.from({ length: tpl.param_count }, (_, i) => str(fd, `param_${i + 1}`).slice(0, 200));
    if (params.some((p) => !p)) return fail("Preencha todos os parâmetros do template.");

    const admin = createSupabaseAdminClient();
    const { data: convId, error } = await admin.rpc("start_outbound_conversation", { p_company_id: companyId });
    if (error) {
      if (/autoriza/i.test(error.message)) return fail("Contato sem autorização válida para mensagem iniciada pela empresa.");
      throw error;
    }
    const res = await sendAsTeam({
      conversationId: convId as string, userId: profile.id, idempotencyKey: idem, kind: "template",
      template: { name: tpl.name, language: tpl.language, preview: tpl.body_preview, params },
    });
    revalidatePath(`/empresas/${companyId}`);
    return res.ok ? ok("Template enviado. A conversa aparece em Conversas.") : fail(res.message);
  } catch (e) {
    return toResult(e);
  }
}
