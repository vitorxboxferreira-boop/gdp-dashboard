// WhatsApp Business Platform — Cloud API oficial (Meta).
// Código puro (WebCrypto + fetch): roda em Node 20+ e Deno.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
//
// NÃO usa WhatsApp Web, QR Code ou bibliotecas não oficiais.

import { timingSafeEqualStr } from "./security.ts";

// ---------------------------------------------------------------------------
// Assinatura do webhook (X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(appSecret, corpo bruto))
// ---------------------------------------------------------------------------
async function hmacSha256Hex(secret: string, data: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data as BufferSource));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyWebhookSignature(
  rawBody: string | Uint8Array,
  signatureHeader: string | null | undefined,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(signatureHeader.trim());
  if (!m) return false;
  const bytes = typeof rawBody === "string" ? new TextEncoder().encode(rawBody) : rawBody;
  const expected = await hmacSha256Hex(appSecret, bytes);
  return timingSafeEqualStr(expected, m[1].toLowerCase());
}

// ---------------------------------------------------------------------------
// Normalização do wa_id
// O WhatsApp pode informar celulares brasileiros sem o 9º dígito (ex.: 555599991234).
// Para vincular à empresa usamos E.164 com o 9; para responder usamos o wa_id original.
// ---------------------------------------------------------------------------
export function waIdToE164(waId: string | null | undefined): string | null {
  const digits = (waId ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("55") && digits.length === 12 && /^[6-9]/.test(digits.slice(4))) {
    return `+55${digits.slice(2, 4)}9${digits.slice(4)}`;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

// ---------------------------------------------------------------------------
// Parser do payload do webhook
// ---------------------------------------------------------------------------
export interface InboundMessage {
  wamid: string;
  waId: string;
  phoneE164: string;
  contactName: string | null;
  phoneNumberId: string | null;
  type: string;
  body: string | null;
  timestamp: Date;
}

export interface StatusUpdate {
  wamid: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp: Date;
  recipientId: string | null;
  error: string | null;
  phoneNumberId: string | null;
}

export interface ParsedWebhook {
  messages: InboundMessage[];
  statuses: StatusUpdate[];
  ignored: number;
}

// deno-lint-ignore no-explicit-any
type Json = any;

const MEDIA_LABELS: Record<string, string> = {
  image: "imagem",
  audio: "áudio",
  video: "vídeo",
  document: "documento",
  sticker: "figurinha",
  location: "localização",
  contacts: "contato",
  reaction: "reação",
  unsupported: "mensagem não suportada",
};

/** Extrai texto sem baixar mídia (minimização de dados). */
function messageBody(msg: Json): string | null {
  switch (msg?.type) {
    case "text":
      return typeof msg.text?.body === "string" ? msg.text.body : null;
    case "button":
      return msg.button?.text ?? msg.button?.payload ?? null;
    case "interactive":
      return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? null;
    case "reaction":
      return msg.reaction?.emoji ? `[reação ${msg.reaction.emoji}]` : "[reação removida]";
    default: {
      const caption = msg?.[msg?.type]?.caption;
      const label = MEDIA_LABELS[msg?.type] ?? msg?.type ?? "mensagem";
      return caption ? `[${label}] ${caption}` : `[${label}]`;
    }
  }
}

function tsFromUnix(v: unknown): Date {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : new Date();
}

export function parseWebhookPayload(payload: Json): ParsedWebhook {
  const out: ParsedWebhook = { messages: [], statuses: [], ignored: 0 };
  if (payload?.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return out;

  for (const entry of payload.entry) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "messages") {
        out.ignored++;
        continue;
      }
      const value = change.value ?? {};
      const phoneNumberId: string | null = value.metadata?.phone_number_id ?? null;
      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c?.wa_id) names.set(String(c.wa_id), c.profile?.name ?? "");
      }
      for (const msg of value.messages ?? []) {
        const waId = String(msg?.from ?? "");
        const phoneE164 = waIdToE164(waId);
        if (!msg?.id || !phoneE164) {
          out.ignored++;
          continue;
        }
        out.messages.push({
          wamid: String(msg.id),
          waId,
          phoneE164,
          contactName: names.get(waId) || null,
          phoneNumberId,
          type: String(msg.type ?? "unknown"),
          body: messageBody(msg),
          timestamp: tsFromUnix(msg.timestamp),
        });
      }
      for (const st of value.statuses ?? []) {
        if (!st?.id || !st?.status) {
          out.ignored++;
          continue;
        }
        const err = Array.isArray(st.errors) && st.errors[0]
          ? `${st.errors[0].code ?? ""} ${st.errors[0].title ?? ""} ${st.errors[0].error_data?.details ?? st.errors[0].message ?? ""}`.trim()
          : null;
        out.statuses.push({
          wamid: String(st.id),
          status: String(st.status),
          timestamp: tsFromUnix(st.timestamp),
          recipientId: st.recipient_id ?? null,
          error: err,
          phoneNumberId,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Intenções simples detectadas sem IA: descadastro e pedido de humano
// ---------------------------------------------------------------------------
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const DEFAULT_OPT_OUT_KEYWORDS = [
  "parar", "pare", "sair", "stop", "cancelar", "descadastrar", "remover",
  "nao quero receber", "nao quero mais", "nao me mande mais", "nao envie mais",
];
export const DEFAULT_HUMAN_KEYWORDS = [
  "atendente", "humano", "pessoa real", "falar com alguem", "falar com uma pessoa", "falar com o responsavel",
];

/**
 * Descadastro: a mensagem inteira é uma palavra-chave (ex.: "PARAR", "sair!"),
 * ou contém uma frase-chave de 2+ palavras em mensagem curta (ex.: "por favor não quero receber").
 * Evita falsos positivos como "vou sair do trabalho às 18h".
 */
export function detectOptOut(text: string | null | undefined, keywords: string[] = DEFAULT_OPT_OUT_KEYWORDS): boolean {
  if (!text) return false;
  const t = normalizeForMatch(text);
  if (!t) return false;
  const kws = keywords.map(normalizeForMatch).filter(Boolean);
  if (kws.includes(t)) return true;
  const short = t.split(" ").length <= 10;
  return short && kws.some((k) => k.includes(" ") && ` ${t} `.includes(` ${k} `));
}

export function detectHumanRequest(text: string | null | undefined, keywords: string[] = DEFAULT_HUMAN_KEYWORDS): boolean {
  if (!text) return false;
  const t = ` ${normalizeForMatch(text)} `;
  return keywords.map(normalizeForMatch).filter(Boolean).some((k) => t.includes(` ${k} `));
}

// ---------------------------------------------------------------------------
// Envio (Graph API)
// ---------------------------------------------------------------------------
export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface SendConfig {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

/** Mensagem de texto livre — permitida somente dentro da janela de 24h. */
export async function sendTextMessage(cfg: SendConfig, to: string, body: string): Promise<{ wamid: string }> {
  if (!/^v\d+\.\d+$/.test(cfg.graphVersion)) throw new Error("Versão da Graph API inválida");
  const url = `https://graph.facebook.com/${cfg.graphVersion}/${encodeURIComponent(cfg.phoneNumberId)}/messages`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 15000);
  let res: Response;
  try {
    res = await (cfg.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { preview_url: false, body },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new WhatsAppApiError(`Falha de rede ao chamar a Cloud API: ${(err as Error).message}`, 0, null, true);
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
    const code = typeof json?.error?.code === "number" ? json.error.code : null;
    const retryable = res.status === 429 || res.status >= 500 || code === 130429 || code === 131000;
    throw new WhatsAppApiError(
      `Cloud API ${res.status}${code ? ` (código ${code})` : ""}: ${json?.error?.message ?? "erro"}`,
      res.status,
      code,
      retryable,
    );
  }
  const wamid = json?.messages?.[0]?.id;
  if (!wamid) throw new WhatsAppApiError("Resposta da Cloud API sem id de mensagem", res.status, null, false);
  return { wamid: String(wamid) };
}
