// Webhook oficial da WhatsApp Business Platform (Cloud API).
// GET  → verificação da assinatura do webhook (hub.challenge)
// POST → eventos (mensagens recebidas e status de entrega), com validação HMAC.
import { handleVerification, handleWebhookEvent } from "@core/whatsapp-webhook.ts";
import { DEFAULT_HUMAN_KEYWORDS, DEFAULT_OPT_OUT_KEYWORDS } from "@core/whatsapp.ts";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

function reply(status: number, body: Record<string, unknown> | string) {
  return typeof body === "string"
    ? new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    : Response.json(body, { status });
}

export function GET(req: Request) {
  const res = handleVerification(new URL(req.url).searchParams, serverEnv.whatsappVerifyToken);
  return reply(res.status, res.body);
}

export async function POST(req: Request) {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { error: "payload muito grande" });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "payload muito grande" });

  // A assinatura é verificada ANTES de qualquer acesso ao banco.
  let db: ReturnType<typeof createSupabaseAdminClient> | null = null;
  const getDb = () => (db ??= createSupabaseAdminClient());

  try {
    const res = await handleWebhookEvent(raw, req.headers.get("x-hub-signature-256"), {
      appSecret: serverEnv.whatsappAppSecret,
      expectedPhoneNumberId: serverEnv.whatsappPhoneNumberId,
      async getKeywords() {
        const { data } = await getDb().from("agent_settings").select("opt_out_keywords, human_request_keywords").eq("id", 1).single();
        return {
          optOut: data?.opt_out_keywords?.length ? data.opt_out_keywords : DEFAULT_OPT_OUT_KEYWORDS,
          human: data?.human_request_keywords?.length ? data.human_request_keywords : DEFAULT_HUMAN_KEYWORDS,
        };
      },
      async ingestMessage(m) {
        const { data, error } = await getDb().rpc("ingest_whatsapp_message", {
          p_event_id: m.wamid,
          p_wa_id: m.waId,
          p_phone_e164: m.phoneE164,
          p_contact_name: m.contactName,
          p_phone_number_id: m.phoneNumberId,
          p_type: m.type,
          p_body: m.body,
          p_timestamp: m.timestamp.toISOString(),
          p_opt_out: m.optOut,
          p_human_request: m.humanRequest,
        });
        if (error) throw new Error(`ingest: ${error.message}`);
        return { duplicate: Boolean((data as { duplicate?: boolean })?.duplicate) };
      },
      async applyStatus(s) {
        const { data, error } = await getDb().rpc("apply_whatsapp_status", {
          p_wamid: s.wamid,
          p_status: s.status,
          p_timestamp: s.timestamp.toISOString(),
          p_error: s.error,
        });
        if (error) throw new Error(`status: ${error.message}`);
        return Boolean(data);
      },
      log: (msg, data) => console.log(JSON.stringify({ msg, ...data })),
    });
    return reply(res.status, res.body);
  } catch (err) {
    // 500 faz a Meta reenviar; o processamento é idempotente (wamid).
    console.error(JSON.stringify({ msg: "whatsapp.webhook.error", error: (err as Error).message }));
    return reply(500, { error: "erro interno" });
  }
}
