import { NextResponse } from "next/server";
import { timingSafeEqualStr } from "@core/security.ts";
import { isSupabaseConfigured } from "@/lib/public-env";

export const dynamic = "force-dynamic";

/**
 * GET /api/health            → básico, público, sem dados sensíveis.
 * GET /api/health?deep=1     → com "Authorization: Bearer <HEALTHCHECK_TOKEN>": banco, fila, rotinas e falhas.
 *                              200 = ok, 503 = degradado/indisponível (para monitores externos de uptime).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", supabaseConfigured: isSupabaseConfigured, time: new Date().toISOString() });
  }
  const token = process.env.HEALTHCHECK_TOKEN ?? "";
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token.length < 32 || !timingSafeEqualStr(provided, token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createSupabaseAdminClient().rpc("system_health");
    if (error) throw error;
    const h = data as { status: string; issues: string[]; queue: unknown; heartbeats: unknown; automation_paused: boolean };
    return NextResponse.json(
      { status: h.status, issues: h.issues, queue: h.queue, heartbeats: h.heartbeats, automationPaused: h.automation_paused, time: new Date().toISOString() },
      { status: h.status === "ok" ? 200 : 503 },
    );
  } catch {
    return NextResponse.json({ status: "down", issues: ["Banco de dados indisponível ou não configurado"] }, { status: 503 });
  }
}
