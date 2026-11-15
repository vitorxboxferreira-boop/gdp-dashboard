// Integração ponta a ponta: payload assinado → handler do webhook → funções reais do PostgreSQL
// executadas como service_role (mesmo caminho do endpoint /api/webhooks/whatsapp).
// Requer o banco criado por `npm run test:db` e TEST_DATABASE_URL definida.
import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleWebhookEvent, type WebhookDeps } from "@core/whatsapp-webhook.ts";

const url = process.env.TEST_DATABASE_URL;
const SECRET = "segredo-integracao";
const sign = (b: string) => `sha256=${createHmac("sha256", SECRET).update(b).digest("hex")}`;

function payload(messages: unknown[], statuses: unknown[] = []) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "WABA", changes: [{ field: "messages", value: {
      messaging_product: "whatsapp",
      metadata: { phone_number_id: "PNID" },
      contacts: [{ profile: { name: "Maria" }, wa_id: "555599993333" }],
      messages, statuses,
    } }] }],
  });
}
const text = (id: string, body: string) => ({ from: "555599993333", id, timestamp: String(Math.floor(Date.now() / 1000) - 5), type: "text", text: { body } });

describe.skipIf(!url)("webhook WhatsApp + PostgreSQL", () => {
  let client: pg.Client;
  let deps: WebhookDeps;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query("begin");
    await client.query("set local role service_role");
    deps = {
      appSecret: SECRET,
      expectedPhoneNumberId: "PNID",
      async getKeywords() {
        const r = await client.query("select opt_out_keywords, human_request_keywords from public.agent_settings where id = 1");
        return { optOut: r.rows[0].opt_out_keywords, human: r.rows[0].human_request_keywords };
      },
      async ingestMessage(m) {
        const r = await client.query(
          "select public.ingest_whatsapp_message($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as r",
          [m.wamid, m.waId, m.phoneE164, m.contactName, m.phoneNumberId, m.type, m.body, m.timestamp.toISOString(), m.optOut, m.humanRequest],
        );
        return { duplicate: r.rows[0].r.duplicate };
      },
      async applyStatus(s) {
        const r = await client.query("select public.apply_whatsapp_status($1,$2,$3,$4) as ok", [s.wamid, s.status, s.timestamp.toISOString(), s.error]);
        return r.rows[0].ok;
      },
    };
  });

  afterAll(async () => {
    await client?.query("rollback");
    await client?.end();
  });

  it("recebe, deduplica, atualiza status e descadastra", async () => {
    const id1 = `wamid.${randomUUID()}`;
    const b1 = payload([text(id1, "Olá, vi vocês no Google. Quanto custa um site?")]);
    expect((await handleWebhookEvent(b1, sign(b1), deps)).body).toMatchObject({ received: 1 });
    // A Meta reenviou o mesmo evento
    expect((await handleWebhookEvent(b1, sign(b1), deps)).body).toMatchObject({ received: 0, duplicates: 1 });

    const conv = (await client.query("select * from public.conversations where phone_e164 = '+5555999993333'")).rows[0];
    expect(conv.contact_name).toBe("Maria");
    expect(conv.wa_id).toBe("555599993333");
    expect(new Date(conv.service_window_expires_at).getTime()).toBeGreaterThan(Date.now() + 23 * 3600_000);
    expect(Number((await client.query("select count(*) from public.messages where conversation_id = $1", [conv.id])).rows[0].count)).toBe(1);

    // Envio registrado pelo servidor + status de entrega vindo do webhook
    const reg = (await client.query("select public.register_outbound_message($1, 'Olá Maria!', 'humano', null, $2) as r", [conv.id, randomUUID()])).rows[0].r;
    await client.query("select public.complete_outbound_message($1, 'wamid.OUT-INT', null)", [reg.message_id]);
    const b2 = payload([], [{ id: "wamid.OUT-INT", status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)), recipient_id: "555599993333" }]);
    expect((await handleWebhookEvent(b2, sign(b2), deps)).body).toMatchObject({ statuses: 1 });
    expect((await client.query("select status from public.messages where id = $1", [reg.message_id])).rows[0].status).toBe("entregue");

    // Pedido de humano e descadastro
    const b3 = payload([text(`wamid.${randomUUID()}`, "quero falar com um atendente")]);
    expect((await handleWebhookEvent(b3, sign(b3), deps)).body).toMatchObject({ human_requests: 1 });
    const b4 = payload([text(`wamid.${randomUUID()}`, "PARAR")]);
    expect((await handleWebhookEvent(b4, sign(b4), deps)).body).toMatchObject({ opt_outs: 1 });
    expect((await client.query("select count(*) from public.suppression_list where phone_e164 = '+5555999993333'")).rows[0].count).toBe("1");
    const after = (await client.query("select handled_by, agent_paused, opted_out_at from public.conversations where id = $1", [conv.id])).rows[0];
    expect(after).toMatchObject({ handled_by: "humano", agent_paused: true });
    expect(after.opted_out_at).not.toBeNull();
  });

  it("assinatura inválida não toca no banco", async () => {
    const b = payload([text(`wamid.${randomUUID()}`, "oi")]);
    const before = (await client.query("select count(*) from public.messages")).rows[0].count;
    expect((await handleWebhookEvent(b, "sha256=" + "f".repeat(64), deps)).status).toBe(401);
    expect((await client.query("select count(*) from public.messages")).rows[0].count).toBe(before);
  });
});
