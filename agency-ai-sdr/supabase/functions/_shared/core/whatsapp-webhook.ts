// Processamento do webhook do WhatsApp, independente de framework (testável).

import { timingSafeEqualStr } from "./security.ts";
import {
  detectHumanRequest,
  detectOptOut,
  parseWebhookPayload,
  verifyWebhookSignature,
  type InboundMessage,
  type StatusUpdate,
} from "./whatsapp.ts";

export interface WebhookDeps {
  appSecret: string | null;
  /** Se definido, eventos de outros números da conta são ignorados. */
  expectedPhoneNumberId: string | null;
  getKeywords(): Promise<{ optOut: string[]; human: string[] }>;
  ingestMessage(m: InboundMessage & { optOut: boolean; humanRequest: boolean }): Promise<{ duplicate: boolean }>;
  applyStatus(s: StatusUpdate): Promise<boolean>;
  log?(msg: string, data?: Record<string, unknown>): void;
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown> | string;
}

/** GET de verificação (hub.mode=subscribe, hub.verify_token, hub.challenge). */
export function handleVerification(params: URLSearchParams, verifyToken: string | null): WebhookResult {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";
  if (!verifyToken) return { status: 503, body: "verify token não configurado" };
  if (mode === "subscribe" && timingSafeEqualStr(token, verifyToken) && /^[\w-]{1,200}$/.test(challenge)) {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: "forbidden" };
}

/** POST de eventos. Erros inesperados → 500 para a Meta reenviar (processamento é idempotente). */
export async function handleWebhookEvent(
  rawBody: string,
  signature: string | null,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  if (!deps.appSecret) return { status: 503, body: { error: "app secret não configurado" } };
  if (!(await verifyWebhookSignature(rawBody, signature, deps.appSecret))) {
    deps.log?.("whatsapp.webhook.invalid_signature");
    return { status: 401, body: { error: "assinatura inválida" } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "JSON inválido" } };
  }

  const parsed = parseWebhookPayload(payload);
  const fromExpected = (id: string | null) => !deps.expectedPhoneNumberId || id === deps.expectedPhoneNumberId;
  const stats = { received: 0, duplicates: 0, opt_outs: 0, human_requests: 0, statuses: 0, skipped: parsed.ignored };

  const needKeywords = parsed.messages.length > 0;
  const keywords = needKeywords ? await deps.getKeywords() : { optOut: [], human: [] };

  for (const m of parsed.messages) {
    if (!fromExpected(m.phoneNumberId)) {
      stats.skipped++;
      continue;
    }
    const optOut = detectOptOut(m.body, keywords.optOut);
    const humanRequest = !optOut && detectHumanRequest(m.body, keywords.human);
    const res = await deps.ingestMessage({ ...m, optOut, humanRequest });
    if (res.duplicate) stats.duplicates++;
    else {
      stats.received++;
      if (optOut) stats.opt_outs++;
      if (humanRequest) stats.human_requests++;
    }
  }
  for (const s of parsed.statuses) {
    if (!fromExpected(s.phoneNumberId)) {
      stats.skipped++;
      continue;
    }
    if (await deps.applyStatus(s)) stats.statuses++;
  }
  deps.log?.("whatsapp.webhook.processed", stats);
  return { status: 200, body: { ok: true, ...stats } };
}
