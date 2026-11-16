// Condições de corrida reais no PostgreSQL (várias conexões em paralelo, como em produção).
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const N = 8;

describe.skipIf(!url)("concorrência no banco", () => {
  let pool: pg.Pool;
  const phone = `+55559${String(Date.now()).slice(-8)}`;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, max: N + 2 });
  });
  afterAll(async () => {
    await pool.query("delete from public.messages where conversation_id in (select id from public.conversations where phone_e164 = $1)", [phone]);
    await pool.query("delete from public.conversations where phone_e164 = $1", [phone]);
    await pool.query("delete from public.jobs where idempotency_key like 'race-%'");
    await pool.end();
  });

  async function asService<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query("set local role service_role");
      const r = await fn(c);
      await c.query("commit");
      return r;
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }
  const ingest = (wamid: string, body: string) =>
    asService((c) => c.query("select public.ingest_whatsapp_message($1, $2, $3, 'Teste', 'P', 'text', $4, now()) as r", [wamid, phone.slice(1), phone, body]));

  it(`mesmo evento entregue ${N}x em paralelo → 1 mensagem`, async () => {
    const wamid = `wamid.race.${randomUUID()}`;
    const res = await Promise.allSettled(Array.from({ length: N }, () => ingest(wamid, "oi")));
    expect(res.filter((r) => r.status === "rejected")).toEqual([]);
    const { rows } = await pool.query("select count(*)::int as n from public.messages where wa_message_id = $1", [wamid]);
    expect(rows[0].n).toBe(1);
  });

  it(`${N} mensagens simultâneas de um número → 1 conversa aberta, ${N} mensagens`, async () => {
    await pool.query("delete from public.messages where conversation_id in (select id from public.conversations where phone_e164 = $1)", [phone]);
    await pool.query("delete from public.conversations where phone_e164 = $1", [phone]);
    const res = await Promise.allSettled(Array.from({ length: N }, (_, i) => ingest(`wamid.race.${randomUUID()}`, `mensagem ${i}`)));
    expect(res.filter((r) => r.status === "rejected")).toEqual([]);
    const conv = await pool.query("select id, unread_count from public.conversations where phone_e164 = $1 and status <> 'encerrada'", [phone]);
    expect(conv.rowCount).toBe(1);
    expect(conv.rows[0].unread_count).toBe(N);
    const msgs = await pool.query("select count(*)::int as n from public.messages where conversation_id = $1", [conv.rows[0].id]);
    expect(msgs.rows[0].n).toBe(N);
  });

  it("vários workers disputando a fila → nenhuma tarefa executada duas vezes", async () => {
    const keys = Array.from({ length: 30 }, (_, i) => `race-${randomUUID()}-${i}`);
    await asService((c) => c.query(
      "insert into public.jobs (kind, idempotency_key, run_after) select 'analyst.score', k, now() - interval '1 second' from unnest($1::text[]) k",
      [keys],
    ));
    const claimed = await Promise.all(Array.from({ length: N }, (_, w) =>
      asService(async (c) => {
        const ids: string[] = [];
        for (;;) {
          const { rows } = await c.query("select id, idempotency_key from public.claim_jobs($1, 3, 600, array['analyst.score'])", [`w${w}`]);
          const mine = rows.filter((r) => keys.includes(r.idempotency_key));
          if (!rows.length) break;
          ids.push(...mine.map((r) => r.id));
          await c.query("commit; begin; set local role service_role");
        }
        return ids;
      }),
    ));
    const all = claimed.flat();
    expect(all.length).toBe(30);
    expect(new Set(all).size).toBe(30);
  });
});
