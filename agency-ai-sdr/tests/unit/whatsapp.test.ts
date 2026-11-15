import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  detectHumanRequest, detectOptOut, parseWebhookPayload, sendTextMessage, verifyWebhookSignature, waIdToE164, WhatsAppApiError,
} from "@core/whatsapp.ts";
import { handleVerification, handleWebhookEvent, type WebhookDeps } from "@core/whatsapp-webhook.ts";

const SECRET = "app-secret-de-teste";
const sign = (body: string) => `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;

// Formato oficial do webhook (campo "messages")
const payload = {
  object: "whatsapp_business_account",
  entry: [{
    id: "WABA_ID",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "5555000000000", phone_number_id: "PNID" },
        contacts: [{ profile: { name: "João" }, wa_id: "555599991234" }],
        messages: [
          { from: "555599991234", id: "wamid.A", timestamp: "1763290000", type: "text", text: { body: "Oi, quanto custa?" } },
          { from: "555599991234", id: "wamid.B", timestamp: "1763290005", type: "image", image: { id: "media1", caption: "meu cardápio" } },
          { from: "555599991234", id: "wamid.C", timestamp: "1763290010", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "b1", title: "Quero saber mais" } } },
        ],
        statuses: [{ id: "wamid.OUT", status: "failed", timestamp: "1763290020", recipient_id: "555599991234", errors: [{ code: 131047, title: "Re-engagement message" }] }],
      },
    }],
  }],
};

describe("assinatura do webhook", () => {
  it("aceita assinatura correta e rejeita alterada/ausente", async () => {
    const body = JSON.stringify(payload);
    expect(await verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
    expect(await verifyWebhookSignature(body + " ", sign(body), SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, sign(body), "outro-segredo")).toBe(false);
    expect(await verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, "sha1=abc", SECRET)).toBe(false);
  });
});

describe("parser do payload", () => {
  it("extrai mensagens, mídia (sem baixar) e status", () => {
    const p = parseWebhookPayload(payload);
    expect(p.messages).toHaveLength(3);
    expect(p.messages[0]).toMatchObject({ wamid: "wamid.A", waId: "555599991234", phoneE164: "+5555999991234", contactName: "João", phoneNumberId: "PNID", type: "text", body: "Oi, quanto custa?" });
    expect(p.messages[0].timestamp.toISOString()).toBe("2025-11-16T10:46:40.000Z");
    expect(p.messages[1].body).toBe("[imagem] meu cardápio");
    expect(p.messages[2].body).toBe("Quero saber mais");
    expect(p.statuses[0]).toMatchObject({ wamid: "wamid.OUT", status: "failed", error: "131047 Re-engagement message" });
  });
  it("ignora payloads de outros produtos/campos", () => {
    expect(parseWebhookPayload({ object: "page", entry: [] }).messages).toHaveLength(0);
    expect(parseWebhookPayload({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "account_update", value: {} }] }] }).ignored).toBe(1);
  });
});

describe("wa_id → E.164", () => {
  it("insere o 9º dígito em celulares brasileiros informados sem ele", () => {
    expect(waIdToE164("555599991234")).toBe("+5555999991234");
    expect(waIdToE164("5555999991234")).toBe("+5555999991234");
    expect(waIdToE164("555532421234")).toBe("+555532421234"); // fixo: mantém
    expect(waIdToE164("14155550100")).toBe("+14155550100");
    expect(waIdToE164("abc")).toBeNull();
  });
});

describe("descadastro e pedido de humano", () => {
  it.each(["PARAR", "Sair!", "stop", "Não quero receber", "por favor nao quero mais mensagens", "descadastrar"])("descadastro: %s", (t) => {
    expect(detectOptOut(t)).toBe(true);
  });
  it.each(["vou sair do trabalho às 18h", "pode parar no portão", "quanto custa?", "", "Não quero receber visita hoje mas pode mandar o orçamento por aqui amanhã cedo por favor"])("não é descadastro: %s", (t) => {
    expect(detectOptOut(t)).toBe(false);
  });
  it("pedido de humano", () => {
    expect(detectHumanRequest("Quero falar com um atendente")).toBe(true);
    expect(detectHumanRequest("posso falar com alguém?")).toBe(true);
    expect(detectHumanRequest("quanto custa")).toBe(false);
  });
});

describe("handler do webhook", () => {
  const deps = (over: Partial<WebhookDeps> = {}): WebhookDeps => ({
    appSecret: SECRET,
    expectedPhoneNumberId: "PNID",
    getKeywords: async () => ({ optOut: ["parar", "nao quero receber"], human: ["atendente"] }),
    ingestMessage: vi.fn(async () => ({ duplicate: false })),
    applyStatus: vi.fn(async () => true),
    ...over,
  });

  it("verificação GET", () => {
    const ok = handleVerification(new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "12345" }), "tok");
    expect(ok).toEqual({ status: 200, body: "12345" });
    expect(handleVerification(new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "1" }), "tok").status).toBe(403);
    expect(handleVerification(new URLSearchParams(), null).status).toBe(503);
  });

  it("rejeita assinatura inválida sem tocar no banco", async () => {
    const d = deps();
    const res = await handleWebhookEvent(JSON.stringify(payload), "sha256=" + "0".repeat(64), d);
    expect(res.status).toBe(401);
    expect(d.ingestMessage).not.toHaveBeenCalled();
  });

  it("sem app secret configurado: 503", async () => {
    expect((await handleWebhookEvent("{}", null, deps({ appSecret: null }))).status).toBe(503);
  });

  it("processa mensagens e status, detecta descadastro", async () => {
    const body = JSON.stringify({
      ...payload,
      entry: [{ ...payload.entry[0], changes: [{ ...payload.entry[0].changes[0], value: { ...payload.entry[0].changes[0].value, messages: [{ from: "555599991234", id: "wamid.X", timestamp: "1763290000", type: "text", text: { body: "PARAR" } }] } }] }],
    });
    const d = deps();
    const res = await handleWebhookEvent(body, sign(body), d);
    expect(res.status).toBe(200);
    expect(d.ingestMessage).toHaveBeenCalledWith(expect.objectContaining({ wamid: "wamid.X", optOut: true, humanRequest: false }));
    expect(d.applyStatus).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({ received: 1, opt_outs: 1, statuses: 1 });
  });

  it("ignora eventos de outro número da conta", async () => {
    const body = JSON.stringify(payload);
    const d = deps({ expectedPhoneNumberId: "OUTRO" });
    const res = await handleWebhookEvent(body, sign(body), d);
    expect(d.ingestMessage).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ received: 0 });
  });

  it("conta duplicatas (reenvio da Meta)", async () => {
    const body = JSON.stringify(payload);
    const res = await handleWebhookEvent(body, sign(body), deps({ ingestMessage: vi.fn(async () => ({ duplicate: true })) }));
    expect(res.body).toMatchObject({ received: 0, duplicates: 3 });
  });

  it("erro do banco propaga (→ 500, a Meta reenvia)", async () => {
    const body = JSON.stringify(payload);
    await expect(handleWebhookEvent(body, sign(body), deps({ ingestMessage: vi.fn(async () => { throw new Error("db down"); }) }))).rejects.toThrow("db down");
  });
});

describe("envio pela Cloud API", () => {
  const cfg = { accessToken: "TOKEN", phoneNumberId: "PNID", graphVersion: "v23.0" };

  it("monta a requisição oficial de texto", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: "wamid.OUT1" }] }), { status: 200 }));
    const res = await sendTextMessage({ ...cfg, fetchImpl }, "555599991234", "Olá!");
    expect(res.wamid).toBe("wamid.OUT1");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/PNID/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN");
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: "whatsapp", recipient_type: "individual", to: "555599991234", type: "text", text: { preview_url: false, body: "Olá!" },
    });
  });

  it("classifica erros", async () => {
    const outside = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Re-engagement", code: 131047 } }), { status: 400 }));
    await expect(sendTextMessage({ ...cfg, fetchImpl: outside }, "1", "x")).rejects.toMatchObject({ code: 131047, retryable: false });
    const limited = vi.fn(async () => new Response(JSON.stringify({ error: { message: "rate", code: 130429 } }), { status: 400 }));
    await expect(sendTextMessage({ ...cfg, fetchImpl: limited }, "1", "x")).rejects.toMatchObject({ retryable: true });
    await expect(sendTextMessage({ ...cfg, graphVersion: "latest" }, "1", "x")).rejects.toThrow();
    const down = vi.fn(async () => { throw new TypeError("net"); });
    await expect(sendTextMessage({ ...cfg, fetchImpl: down }, "1", "x")).rejects.toBeInstanceOf(WhatsAppApiError);
  });
});
