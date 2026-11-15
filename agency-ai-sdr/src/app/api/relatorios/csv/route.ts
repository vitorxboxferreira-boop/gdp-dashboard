// Exportação CSV das métricas por dia (autenticado; RLS/funções validam o papel).
import { getCurrentProfile, hasRole } from "@/lib/auth";
import { parsePeriod, REPORT_FIELDS } from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Evita injeção de fórmulas ao abrir no Excel/Sheets. */
function cell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !hasRole(profile, "viewer")) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  const { from, to } = parsePeriod(url.searchParams.get("de") ?? undefined, url.searchParams.get("ate") ?? undefined);
  const days = Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000) + 1;
  if (days > 92) return new Response("período máximo de 92 dias", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const header = ["data", ...REPORT_FIELDS.map(([, label]) => label)];
  const lines = [header.map(cell).join(";")];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const { data, error } = await supabase.rpc("report_metrics", { p_from: date, p_to: date });
    if (error) return new Response("erro ao calcular métricas", { status: 500 });
    const m = data as Record<string, number>;
    lines.push([date, ...REPORT_FIELDS.map(([k, , kind]) => (kind === "brl" ? (Number(m[k] ?? 0) / 100).toFixed(2) : String(m[k] ?? 0)))].map(cell).join(";"));
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agency-sdr-${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
