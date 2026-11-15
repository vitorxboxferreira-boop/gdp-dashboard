"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAsTeam } from "@/lib/whatsapp-send";
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
 * Ordem: papel → sendAsTeam (credenciais → verificação no banco → registro idempotente → API → resultado).
 */
export async function sendHumanMessage(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    const conversationId = uuid.parse(str(fd, "conversation_id"));
    const body = z.string().trim().min(1, "Escreva a mensagem").max(4096, "Máximo de 4096 caracteres").parse(str(fd, "body"));
    const idem = z.string().uuid("Chave de envio inválida").parse(str(fd, "idempotency_key"));
    const res = await sendAsTeam({ conversationId, userId: profile.id, idempotencyKey: idem, kind: "free_text", body });
    revalidatePath(`/conversas/${conversationId}`);
    return res.ok ? ok(res.message) : fail(res.message);
  } catch (e) {
    return toResult(e);
  }
}
