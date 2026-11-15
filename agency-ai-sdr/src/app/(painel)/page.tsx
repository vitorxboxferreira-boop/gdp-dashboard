import Link from "next/link";
import { PriorityBadge, WebsiteBadge } from "@/components/badges";
import { RunAnalysisButton, RunSearchButton } from "@/components/run-buttons";
import { Badge, Card, Notice, PageHeader, StatCard } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { integrationStatuses } from "@/lib/env";
import { fmtBRL, fmtDate, fmtDateTime, fmtInt, fmtUSD, PRIORITY_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyRow, LeadPriority, LeadRow } from "@/lib/types";

export const metadata = { title: "Visão geral" };
export const maxDuration = 60;

type Metrics = Record<string, number | string | Record<string, number>>;

export default async function OverviewPage() {
  const profile = await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const [{ data: metrics }, { data: campaign }, { data: recent }] = await Promise.all([
    supabase.rpc("dashboard_metrics"),
    supabase.from("campaigns").select("id, campaign_date, trigger, status, stats, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("companies")
      .select("id, name, city, website_status, is_demo, discovered_at, leads(priority, score)")
      .order("discovered_at", { ascending: false })
      .limit(8),
  ]);
  const m = (metrics ?? {}) as Metrics;
  const byPriority = (m.leads_by_priority ?? {}) as Record<string, number>;
  const totalScored = Object.values(byPriority).reduce((a, b) => a + b, 0);
  const pending = integrationStatuses().filter((i) => i.phase === 1 && !i.configured);
  const n = (k: string) => fmtInt(m[k] as number);

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`Hoje, ${fmtDate(String(m.today ?? ""))} (horário de Brasília).`}
        actions={hasRole(profile, "operator") ? <><RunSearchButton /><RunAnalysisButton /></> : undefined}
      />

      {pending.length > 0 && (
        <div className="mb-6">
          <Notice tone="warn" title="Integrações pendentes">
            {pending.map((p) => p.label).join(", ")}. Veja <Link href="/configuracoes" className="underline">Configurações</Link>.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Empresas encontradas hoje" value={n("companies_today")} hint={`${n("companies_total")} no total`} />
        <StatCard label="Sem site identificado" value={n("without_site")} hint="Inclui “não identificado” (a verificar)" />
        <StatCard label="Leads qualificados" value={n("qualified_leads")} hint="Alta + média prioridade" tone="ok" />
        <StatCard label="Contatos autorizados" value={n("authorized_contacts")} hint="Autorização válida para WhatsApp" />
        <StatCard label="Conversas recebidas hoje" value={n("conversations_received")} hint="Primeira mensagem hoje" />
        <StatCard label="Conversas em andamento" value={n("conversations_open")} hint="Não encerradas" />
        <StatCard label="Interessados" value={n("interested")} hint="Fase 3" />
        <StatCard label="Reuniões agendadas" value={n("meetings_upcoming")} hint="Fase 4" />
        <StatCard label="Vendas aprovadas" value={n("sales_approved")} hint="Fase 4" />
        <StatCard label="Receita confirmada" value={fmtBRL(m.revenue_confirmed_cents as number)} hint="Somente pagamentos validados" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Leads por prioridade">
          {totalScored === 0 ? (
            <p className="text-sm text-muted">Nenhum lead pontuado ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {(["alta", "media", "baixa", "verificar"] as LeadPriority[]).map((p) => {
                const v = byPriority[p] ?? 0;
                return (
                  <li key={p}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{PRIORITY_LABELS[p]}</span>
                      <span className="tabular-nums text-muted">{v}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${(v / totalScored) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">{fmtInt(m.demo_companies as number)} registros demonstrativos (fictícios) não entram nas métricas.</p>
        </Card>

        <Card title="Última campanha">
          {campaign ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge tone={campaign.status === "concluida" ? "ok" : campaign.status === "falhou" ? "danger" : "info"}>{campaign.status}</Badge>
                <span className="text-muted">{campaign.trigger === "cron" ? "automática" : "manual"} · {fmtDateTime(campaign.created_at)}</span>
              </div>
              <Link href="/campanhas" className="text-accent underline">Ver etapas e resultados</Link>
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma campanha executada.</p>
          )}
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Google Places hoje: {n("places_requests_today")} requisições · custo estimado {fmtUSD(m.estimated_cost_today_usd as number)}
          </div>
        </Card>

        <Card title="Descobertas recentes" actions={<Link href="/empresas" className="text-xs text-accent underline">Todas</Link>}>
          <ul className="divide-y divide-line text-sm">
            {(recent ?? []).map((c) => {
              const company = c as unknown as Pick<CompanyRow, "id" | "name" | "city" | "website_status" | "is_demo"> & { leads: Pick<LeadRow, "priority" | "score"> | null };
              return (
                <li key={company.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/empresas/${company.id}`} className="min-w-0 truncate hover:underline">{company.name}</Link>
                  <span className="flex shrink-0 gap-1">
                    <WebsiteBadge status={company.website_status} />
                    <PriorityBadge priority={company.leads?.priority ?? null} />
                  </span>
                </li>
              );
            })}
            {!recent?.length && <li className="py-2 text-muted">Nenhuma empresa cadastrada.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
