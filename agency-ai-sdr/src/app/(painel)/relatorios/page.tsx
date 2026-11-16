import Link from "next/link";
import { generateReportNow } from "@/actions/reports";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { fmtBRL, fmtDate, fmtDateTime, fmtInt, fmtUSD } from "@/lib/format";
import { parsePeriod, REPORT_FIELDS } from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Relatórios" };
export const maxDuration = 30;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const profile = await requirePageRole("viewer");
  const sp = await searchParams;
  const { from, to } = parsePeriod(sp.de, sp.ate);
  const supabase = await createSupabaseServerClient();
  const [{ data: metrics, error }, { data: reports }] = await Promise.all([
    supabase.rpc("report_metrics", { p_from: from, p_to: to }),
    supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(30),
  ]);
  const m = (metrics ?? {}) as Record<string, number>;
  const fmt = (k: string, kind?: "brl" | "usd") => (kind === "brl" ? fmtBRL(m[k]) : kind === "usd" ? fmtUSD(m[k]) : fmtInt(m[k]));
  const funnel = [
    ["Empresas", m.companies_found], ["Qualificadas", m.leads_qualified], ["Conversas", m.conversations_new],
    ["Oportunidades", m.opportunities], ["Aprovadas", m.sales_approved], ["Pagas", m.sales_paid],
  ] as const;
  const top = Math.max(1, ...funnel.map(([, v]) => Number(v ?? 0)));

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Relatório diário preparado às 11:45 e disponibilizado às 12:00 (metas). Métricas por período em horário de Brasília."
        actions={hasRole(profile, "operator") ? <ActionForm action={generateReportNow} submitLabel="Gerar relatório de hoje" variant="secondary" /> : undefined}
      />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1"><span>De</span><input type="date" name="de" defaultValue={from} /></label>
          <label className="flex flex-col gap-1"><span>Até</span><input type="date" name="ate" defaultValue={to} /></label>
          <button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg">Aplicar</button>
          <a href={`/api/relatorios/csv?de=${from}&ate=${to}`} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2">Exportar CSV</a>
        </form>
      </Card>

      {error ? <p className="text-sm text-danger">Erro ao calcular métricas.</p> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title={`Período ${fmtDate(from)} – ${fmtDate(to)}`} className="lg:col-span-2">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {REPORT_FIELDS.map(([k, label, kind]) => (
                <div key={k}><dt className="text-xs text-muted">{label}</dt><dd className="font-medium tabular-nums">{fmt(k, kind)}</dd></div>
              ))}
            </dl>
          </Card>
          <Card title="Funil do período">
            <ul className="space-y-2.5">
              {funnel.map(([label, v]) => (
                <li key={label}>
                  <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="tabular-nums text-muted">{fmtInt(v)}</span></div>
                  <div className="h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-accent" style={{ width: `${(Number(v ?? 0) / top) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <h2 className="mb-3 mt-6 text-sm font-semibold">Relatórios diários</h2>
      {!reports?.length ? <EmptyState title="Nenhum relatório ainda">Gerados pela campanha automática ou pelo botão acima.</EmptyState> : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} title={`Relatório de ${fmtDate(r.report_date)}`} actions={<div className="flex items-center gap-2"><Badge tone={r.status === "disponivel" ? "ok" : "info"}>{r.status}</Badge><Link className="text-xs text-accent underline" href={`/relatorios?de=${r.report_date}&ate=${r.report_date}`}>detalhar</Link></div>}>
              <pre className="whitespace-pre-wrap font-sans text-sm">{r.summary ?? "—"}</pre>
              <p className="mt-2 text-xs text-muted">Gerado {fmtDateTime(r.generated_at)} · publicado {fmtDateTime(r.published_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
