import { DAILY_PLAN } from "@core/schedule.ts";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Campanhas" };

interface JobRow { id: string; kind: string; status: string; attempts: number; max_attempts: number; run_after: string; finished_at: string | null; last_error: string | null }
interface CampaignRow { id: string; campaign_date: string; trigger: string; status: string; stats: Record<string, unknown>; error: string | null; created_at: string; jobs: JobRow[] }

const tone = (s: string) => (s === "done" || s === "concluida" ? "ok" : s === "dead" || s === "falhou" ? "danger" : s === "cancelled" || s === "cancelada" ? "warn" : "info");
const label = (k: string) => DAILY_PLAN.find((p) => p.step === k)?.label ?? k;

export default async function CampaignsPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, campaign_date, trigger, status, stats, error, created_at, jobs(id, kind, status, attempts, max_attempts, run_after, finished_at, last_error)")
    .order("created_at", { ascending: false })
    .limit(20);
  const campaigns = (data ?? []) as CampaignRow[];

  return (
    <>
      <PageHeader title="Campanhas" description="Execuções diárias (automáticas) e manuais. Cada etapa é uma tarefa na fila, com tentativas controladas e recuperação de falhas." />
      <Card title="Plano diário (seg–sex, America/Sao_Paulo)" className="mb-4">
        <ol className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {DAILY_PLAN.map((p) => (
            <li key={p.step} className="flex gap-2"><span className="w-12 tabular-nums text-muted">{p.time}</span>{p.label}</li>
          ))}
          <li className="flex gap-2"><span className="w-12 text-muted">Exped.</span>Processar respostas (Fase 2)</li>
        </ol>
        <p className="mt-3 text-xs text-muted">Horários são metas operacionais. Não executa em fins de semana/feriados sem configuração explícita. Ativação do agendamento: Fase 5.</p>
      </Card>
      {campaigns.length === 0 ? (
        <EmptyState title="Nenhuma campanha executada">Use “Pesquisar empresas agora” ou ative o piloto automático.</EmptyState>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              title={`${fmtDate(c.campaign_date)} · ${c.trigger === "cron" ? "automática" : "manual"}`}
              actions={<Badge tone={tone(c.status)}>{c.status}</Badge>}
            >
              {c.error && <p className="mb-2 text-sm text-danger">{c.error}</p>}
              <Table>
                <thead><tr><Th>Etapa</Th><Th>Situação</Th><Th>Tentativas</Th><Th>Agendada</Th><Th>Concluída</Th><Th>Observação</Th></tr></thead>
                <tbody>
                  {[...c.jobs].sort((a, b) => a.run_after.localeCompare(b.run_after)).map((j) => (
                    <tr key={j.id}>
                      <Td>{label(j.kind)}</Td>
                      <Td><Badge tone={tone(j.status)}>{j.status}</Badge></Td>
                      <Td className="tabular-nums">{j.attempts}/{j.max_attempts}</Td>
                      <Td className="text-xs">{fmtDateTime(j.run_after)}</Td>
                      <Td className="text-xs">{fmtDateTime(j.finished_at)}</Td>
                      <Td className="max-w-xs text-xs text-muted">{j.last_error ?? ""}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {Object.keys(c.stats ?? {}).length > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted">Resultados detalhados</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3">{JSON.stringify(c.stats, null, 2)}</pre>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
