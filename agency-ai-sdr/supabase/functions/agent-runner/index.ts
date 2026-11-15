// Supabase Edge Function: agent-runner
// Acionada pelo Supabase Cron (pg_cron + pg_net) a cada 5 minutos em horário comercial.
// Cria a campanha diária (se for dia útil e o piloto automático estiver ativo)
// e processa a fila de tarefas. Protegida por segredo compartilhado (x-cron-secret).

import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { orchestratorTick } from "../_shared/core/pipeline.ts";
import { SupabaseRepo } from "../_shared/core/supabase-repo.ts";
import { timingSafeEqualStr } from "../_shared/core/security.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!expected || expected.length < 32) {
    return Response.json({ error: "CRON_SECRET não configurado (mínimo 32 caracteres)" }, { status: 503 });
  }
  if (!timingSafeEqualStr(provided, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return Response.json({ error: "Supabase não configurado" }, { status: 503 });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const repo = new SupabaseRepo(db);
  const worker = `edge-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const result = await orchestratorTick(
      {
        repo,
        placesApiKey: Deno.env.get("GOOGLE_PLACES_API_KEY") ?? null,
        log: (msg, data) => console.log(JSON.stringify({ msg, ...data })),
      },
      { worker, maxJobs: 10, timeBudgetMs: 110_000 },
    );
    return Response.json({ ok: true, worker, ...result });
  } catch (err) {
    console.error(JSON.stringify({ msg: "agent-runner.error", error: (err as Error).message }));
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
});
