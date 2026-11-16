import { Badge, Card, Notice, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { environmentWarnings, integrationStatuses, serverEnv } from "@/lib/env";
import { fmtDateTime, fmtInt } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Monitoramento" };

interface Health {
  status: "ok" | "degraded";
  issues: string[];
  automation_paused: boolean;
  autopilot_enabled: boolean;
  heartbeats: Record<string, { last_seen: string; ok: boolean; details: Record<string, unknown> }>;
  queue: { queued: number; running: number; stuck: number; late: number; dead_24h: number };
  failures_24h: { google_places: number; anthropic: number; whatsapp: number };
  last_inbound_message: string | null;
}
const COMPONENTS: Record<string, string> = { agent_runner: "Rotina agendada (Edge Function)", whatsapp_webhook: "Webhook do WhatsApp" };

export default async function MonitoringPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: dead }] = await Promise.all([
    supabase.rpc("system_health"),
    supabase.from("jobs").select("id, kind, last_error, finished_at, attempts").eq("status", "dead").order("finished_at", { ascending: false }).limit(10),
  ]);
  const h = data as Health | null;
  const warnings = environmentWarnings();

  return (
    <>
      <PageHeader title="Monitoramento" description={`Saúde das rotinas, fila e integrações. Ambiente: ${serverEnv.appEnv}. Para alertas externos, configure um monitor de uptime em /api/health?deep=1 (ver docs/DEPLOY.md).`} />
      {error || !h ? <Notice tone="danger">Não foi possível consultar a saúde do sistema.</Notice> : (
        <>
          <div className="mb-4">
            {h.status === "ok"
              ? <Notice tone="ok" title="Tudo certo">Nenhum problema detectado.</Notice>
              : <Notice tone="warn" title="Atenção">{h.issues.join(" · ")}</Notice>}
          </div>
          {warnings.map((w) => <div key={w} className="mb-2"><Notice tone="warn">{w}</Notice></div>)}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Na fila" value={fmtInt(h.queue.queued)} />
            <StatCard label="Em execução" value={fmtInt(h.queue.running)} />
            <StatCard label="Travadas" value={fmtInt(h.queue.stuck)} tone={h.queue.stuck ? "warn" : "default"} />
            <StatCard label="Atrasadas" value={fmtInt(h.queue.late)} tone={h.queue.late ? "warn" : "default"} />
            <StatCard label="Falhas definitivas (24h)" value={fmtInt(h.queue.dead_24h)} tone={h.queue.dead_24h ? "warn" : "default"} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title="Componentes">
              <ul className="space-y-2 text-sm">
                {Object.entries(COMPONENTS).map(([k, label]) => {
                  const b = h.heartbeats[k];
                  return (
                    <li key={k} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{label}</span>
                      {b ? <span className="flex items-center gap-2"><Badge tone={b.ok ? "ok" : "danger"}>{b.ok ? "ok" : "erro"}</Badge><span className="text-xs text-muted">{fmtDateTime(b.last_seen)}</span></span> : <Badge>nunca executou</Badge>}
                    </li>
                  );
                })}
                <li className="flex justify-between gap-2"><span>Última mensagem recebida</span><span className="text-xs text-muted">{fmtDateTime(h.last_inbound_message)}</span></li>
                <li className="flex justify-between gap-2"><span>Automações</span>{h.automation_paused ? <Badge tone="danger">pausadas</Badge> : h.autopilot_enabled ? <Badge tone="ok">piloto automático</Badge> : <Badge>manual</Badge>}</li>
              </ul>
            </Card>
            <Card title="Falhas de integração (24h)">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Google Places</span><span className="tabular-nums">{h.failures_24h.google_places}</span></li>
                <li className="flex justify-between"><span>IA (Anthropic)</span><span className="tabular-nums">{h.failures_24h.anthropic}</span></li>
                <li className="flex justify-between"><span>WhatsApp (envios que falharam)</span><span className="tabular-nums">{h.failures_24h.whatsapp}</span></li>
              </ul>
            </Card>
            <Card title="Integrações" className="lg:col-span-2">
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                {integrationStatuses().map((i) => (
                  <li key={i.key} className="flex items-center justify-between gap-2">
                    <span>{i.label}</span>
                    {i.configured ? <Badge tone="ok">credencial presente</Badge> : <Badge tone="warn">não configurada</Badge>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Últimas falhas definitivas" className="lg:col-span-2">
              {!dead?.length ? <p className="text-sm text-muted">Nenhuma.</p> : (
                <Table>
                  <thead><tr><Th>Quando</Th><Th>Tarefa</Th><Th>Tentativas</Th><Th>Erro</Th></tr></thead>
                  <tbody>{dead.map((j) => (
                    <tr key={j.id}><Td className="whitespace-nowrap text-xs">{fmtDateTime(j.finished_at)}</Td><Td>{j.kind}</Td><Td>{j.attempts}</Td><Td className="text-xs text-muted">{j.last_error}</Td></tr>
                  ))}</tbody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
