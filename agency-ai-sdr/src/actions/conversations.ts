"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendTextMessage, WhatsAppApiError } from "@core/whatsapp.ts";
import { requireActionRole } from "@/lib/auth";
import { serverEnv, whatsappSendConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

const uuid = z.string().uuid("Conversa inválida");

async function updateConversation(id: string, patch: Record<string, unknown>, msg: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("conversations").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath(`/conversas/${id}`);
  revalidatePath("/conversas");
  return ok(msg);
}

/** Assumir manualmente: pausa o agente nesta conversa. */
export async function takeOverConversation(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    return await updateConversation(uuid.parse(str(fd, "conversation_id")), {
      handled_by: "humano", agent_paused: true, status: "humano", assigned_to: profile.id,
    }, "Você assumiu a conversa. O agente está pausado aqui.");
  } catch (e) {
    return toResult(e);
  }
}

/** Devolver ao agente (o agente só responderá quando a Fase 3 estiver ativa e validada). */
export async function returnToAgent(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    return await updateConversation(uuid.parse(str(fd, "conversation_id")), {
      handled_by: "agente", agent_paused: false, status: "aberta", assigned_to: null,
    }, "Conversa devolvida ao agente.");
  } catch (e) {
    return toResult(e);
  }
}

export async function closeConversation(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    return await updateConversation(uuid.parse(str(fd, "conversation_id")), { status: "encerrada", unread_count: 0 }, "Conversa encerrada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    await requireActionRole("operator");
    const supabase = await createSupabaseServerClient();
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", uuid.parse(conversationId)).gt("unread_count", 0);
  } catch {
    /* leitura não deve falhar a página */
  }
}

/**
 * Envio manual pelo operador. Somente texto livre dentro da janela de 24h.
 * Ordem: papel → credenciais → verificação no banco → registro idempotente → API → resultado.
 */
export async function sendHumanMessage(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    const conversationId = uuid.parse(str(fd, "conversation_id"));
    const body = z.string().trim().min(1, "Escreva a mensagem").max(4096, "Máximo de 4096 caracteres").parse(str(fd, "body"));
    const idem = z.string().uuid("Chave de envio inválida").parse(str(fd, "idempotency_key"));
    if (!whatsappSendConfigured()) return fail("Credenciais de envio do WhatsApp não configuradas no servidor.");

    const admin = createSupabaseAdminClient();
    const { data: check, error: checkErr } = await admin.rpc("whatsapp_send_check", {
      p_conversation_id: conversationId, p_sender: "humano", p_kind: "free_text",
    });
    if (checkErr) throw checkErr;
    const c = check as { allowed: boolean; reasons: string[] };
    if (!c.allowed) return fail(`Envio bloqueado: ${c.reasons.join("; ")}.`);

    const { data: conv, error: convErr } = await admin.from("conversations").select("wa_id, phone_e164").eq("id", conversationId).single();
    if (convErr) throw convErr;

    const { data: reg, error: regErr } = await admin.rpc("register_outbound_message", {
      p_conversation_id: conversationId, p_body: body, p_sender: "humano", p_sent_by: profile.id, p_idempotency_key: idem,
    });
    if (regErr) throw regErr;
    const r = reg as { message_id: string; duplicate: boolean; status: string };
    if (r.duplicate) return r.status === "falhou" ? fail("Este envio já foi tentado e falhou.") : ok("Mensagem já enviada.");

    let wamid: string | null = null;
    let sendError: string | null = null;
    try {
      ({ wamid } = await sendTextMessage(
        { accessToken: serverEnv.whatsappAccessToken!, phoneNumberId: serverEnv.whatsappPhoneNumberId!, graphVersion: serverEnv.whatsappGraphVersion },
        conv.wa_id ?? conv.phone_e164,
        body,
      ));
    } catch (err) {
      sendError = err instanceof WhatsAppApiError ? err.message : "Falha inesperada no envio";
    }

    const { error: doneErr } = await admin.rpc("complete_outbound_message", { p_message_id: r.message_id, p_wamid: wamid, p_error: sendError });
    if (doneErr) throw doneErr;
    await admin.from("usage_events").insert({
      provider: "whatsapp",
      operation: "message.send.free_text",
      units: 1,
      // Mensagens de serviço dentro da janela de 24h: sem cobrança por mensagem na tabela atual da Meta (confirme).
      estimated_cost_usd: 0,
      success: !sendError,
      metadata: { conversation_id: conversationId, error: sendError },
    });

    revalidatePath(`/conversas/${conversationId}`);
    return sendError ? fail(`Não enviada: ${sendError}`) : ok("Mensagem enviada.");
  } catch (e) {
    return toResult(e);
  }
}
