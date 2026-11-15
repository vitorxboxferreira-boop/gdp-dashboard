import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/public-env";

export const dynamic = "force-dynamic";

/** Verificação de saúde sem dados sensíveis (para monitoramento externo). */
export function GET() {
  return NextResponse.json({ status: "ok", supabaseConfigured: isSupabaseConfigured, time: new Date().toISOString() });
}
