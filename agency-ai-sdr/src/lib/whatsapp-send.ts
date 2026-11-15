import "server-only";
import { renderTemplatePreview, sendTemplateMessage, sendTextMessage, WhatsAppApiError } from "@core/whatsapp.ts";
import { serverEnv, whatsappSendConfigured } from "./env";
import { createSupabaseAdminClient } from "./supabase/admin";

export interface TeamSendInput {
  conversationId: string;
  userId: string;
  idempotencyKey: string;
  kind: "free_text" | "template";
  body?: string;
  template?: { name: string; language: string; preview: string; params: string[] };
}

/**
 * Envio pela equipe. Ordem: credenciais → verificação no banco → registro idempotente → API → resultado → custo.
 * Chamar SOMENTE após verificar o papel do usuário (operador ou superior).
 */
export async function sendAsTeam(input: TeamSendInput): Promise<{ ok: boolean; message: string }> {
  if (!whatsappSendConfigured()) return { ok: false, message: "Credenciais de envio do WhatsApp não configuradas no servidor." };
  const admin = createSupabaseAdminClient();

  const { data: check, error: checkErr } = await admin.rpc("whatsapp_send_check", {
    p_conversation_id: input.conversationId, p_sender: "humano", p_kind: input.kind,
  });
  if (checkErr) throw checkErr;
  const c = check as { allowed: boolean; reasons: string[] };
  if (!c.allowed) return { ok: false, message: `Envio bloqueado: ${c.reasons.join("; ")}.` };

  const { data: conv, error: convErr } = await admin.from("conversations").select("wa_id, phone_e164").eq("id", input.conversationId).single();
  if (convErr) throw convErr;

  const body = input.kind === "template" ? renderTemplatePreview(input.template!.preview, input.template!.params) : input.body!;
  const { data: reg, error: regErr } = await admin.rpc("register_outbound_message", {
    p_conversation_id: input.conversationId, p_body: body, p_sender: "humano", p_sent_by: input.userId,
    p_idempotency_key: input.idempotencyKey, p_message_type: input.kind === "template" ? "template" : "text",
    p_template_name: input.kind === "template" ? input.template!.name : null,
  });
  if (regErr) throw regErr;
  const r = reg as { message_id: string; duplicate: boolean; status: string };
  if (r.duplicate) return r.status === "falhou" ? { ok: false, message: "Este envio já foi tentado e falhou." } : { ok: true, message: "Mensagem já enviada." };

  const cfg = { accessToken: serverEnv.whatsappAccessToken!, phoneNumberId: serverEnv.whatsappPhoneNumberId!, graphVersion: serverEnv.whatsappGraphVersion };
  const to = conv.wa_id ?? conv.phone_e164;
  let wamid: string | null = null;
  let sendError: string | null = null;
  try {
    ({ wamid } = input.kind === "template"
      ? await sendTemplateMessage(cfg, to, { name: input.template!.name, language: input.template!.language, bodyParams: input.template!.params })
      : await sendTextMessage(cfg, to, body));
  } catch (err) {
    sendError = err instanceof WhatsAppApiError ? err.message : "Falha inesperada no envio";
  }

  const { error: doneErr } = await admin.rpc("complete_outbound_message", { p_message_id: r.message_id, p_wamid: wamid, p_error: sendError });
  if (doneErr) throw doneErr;

  let cost = 0;
  if (input.kind === "template") {
    const { data: s } = await admin.from("agent_settings").select("whatsapp_cost_per_message_usd").eq("id", 1).single();
    cost = Number(s?.whatsapp_cost_per_message_usd ?? 0);
  }
  await admin.from("usage_events").insert({
    provider: "whatsapp",
    operation: input.kind === "template" ? "message.send.template" : "message.send.free_text",
    units: 1,
    // Texto livre dentro da janela de 24h: sem cobrança por mensagem na tabela atual da Meta (confirme). Templates: estimativa configurada.
    estimated_cost_usd: sendError ? 0 : cost,
    success: !sendError,
    metadata: { conversation_id: input.conversationId, template: input.template?.name, error: sendError },
  });
  return sendError ? { ok: false, message: `Não enviada: ${sendError}` } : { ok: true, message: "Mensagem enviada." };
}
