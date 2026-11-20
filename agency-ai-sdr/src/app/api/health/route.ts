import { NextResponse } from "next/server";
import { timingSafeEqualStr } from "@core/security.ts";
import { isSupabaseConfigured, publicEnv } from "@/lib/public-env";

export const dynamic = "force-dynamic";

type AuthCheck = "ok" | "chave_invalida" | "url_inacessivel" | "nao_configurado" | "erro";

/** Verifica se a URL e a chave pública do Supabase funcionam (não expõe valores). */
async function checkSupabaseAuth(): Promise<{ status: AuthCheck; http?: number; detail?: string }> {
  if (!isSupabaseConfigured) return { status: "nao_configurado" };
  try {
    const res = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabasePublishableKey },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (res.ok) return { status: "ok", http: res.status };
    if (res.status === 401 || res.status === 403) return { status: "chave_invalida", http: res.status };
    return { status: "erro", http: res.status };
  } catch (err) {
    return { status: "url_inacessivel", detail: (err as Error).name };
  }
}

function keyKind(k: string): string {
  if (k.startsWith("sb_publishable_")) return "publishable";
  if (k.startsWith("sb_secret_")) return "SECRETA (errado: use a publishable)";
  if (k.startsWith("eyJ")) return "anon/jwt";
  return k ? "formato desconhecido" : "ausente";
}

/**
 * GET /api/health → público, só "ok" (sem nome de projeto, chave ou estado da conexão).
 * GET /api/health?deep=1 → com "Authorization: Bearer <HEALTHCHECK_TOKEN>": diagnóstico do Supabase,
 *                          banco, fila, rotinas e falhas. 200 = ok, 503 = degradado/indisponível.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", time: new Date().toISOString() });
  }
  const token = process.env.HEALTHCHECK_TOKEN ?? "";
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token.length < 32 || !timingSafeEqualStr(provided, token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const auth = await checkSupabaseAuth();
    let host = "";
    try {
      host = new URL(publicEnv.supabaseUrl).host;
    } catch {
      /* URL ausente ou inválida */
    }
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createSupabaseAdminClient().rpc("system_health");
    if (error) throw error;
    const h = data as { status: string; issues: string[]; queue: unknown; heartbeats: unknown; automation_paused: boolean };
    const degraded = h.status !== "ok" || auth.status !== "ok";
    return NextResponse.json(
      {
        status: degraded ? "degraded" : "ok",
        issues: h.issues,
        queue: h.queue,
        heartbeats: h.heartbeats,
        automationPaused: h.automation_paused,
        supabase: { projeto: host, tipoDaChavePublica: keyKind(publicEnv.supabasePublishableKey), autenticacao: auth },
        time: new Date().toISOString(),
      },
      { status: degraded ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "down", issues: ["Banco de dados indisponível ou não configurado"] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
