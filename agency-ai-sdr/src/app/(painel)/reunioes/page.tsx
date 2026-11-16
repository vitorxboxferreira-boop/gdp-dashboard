import Link from "next/link";
import { formatBrPhone } from "@core/phone.ts";
import { computeAvailableSlots, formatSlotPtBr, meetingConfigFrom } from "@core/scheduling.ts";
import { confirmMeeting, createMeeting, saveMeetingSettings, updateMeetingStatus } from "@/actions/meetings";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, Notice, PageHeader } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Reuniões" };
export const maxDuration = 30;

interface Appt {
  id: string; contact_name: string; phone_e164: string | null; starts_at: string; ends_at: string; reason: string | null; status: string;
  requested_by_agent: boolean; conversation_id: string | null; confirmed_at: string | null; cancelled_reason: string | null;
  companies: { id: string; name: string } | null;
}
const STATUS: Record<string, ["warn" | "ok" | "neutral" | "info" | "danger", string]> = {
  aguardando_aprovacao: ["warn", "Aguardando confirmação"], proposta: ["info", "Proposta"], confirmada: ["ok", "Confirmada"], cancelada: ["neutral", "Cancelada"], realizada: ["neutral", "Realizada"],
};
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function MeetingsPage() {
  const profile = await requirePageRole("viewer");
  const canOperate = hasRole(profile, "operator");
  const isAdmin = hasRole(profile, "admin");
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const [{ data: s }, { data: appts }, { data: holidays }] = await Promise.all([
    supabase.from("agent_settings").select("*").eq("id", 1).single(),
    supabase.from("appointments")
      .select("id, contact_name, phone_e164, starts_at, ends_at, reason, status, requested_by_agent, conversation_id, confirmed_at, cancelled_reason, companies(id, name)")
      .gte("ends_at", new Date(now.getTime() - 7 * 86_400_000).toISOString())
      .order("starts_at").limit(200),
    supabase.from("holidays").select("holiday_date"),
  ]);
  const list = (appts ?? []) as unknown as Appt[];
  const pending = list.filter((a) => a.status === "aguardando_aprovacao" || a.status === "proposta");
  const upcoming = list.filter((a) => a.status === "confirmada" && new Date(a.ends_at) > now);
  const past = list.filter((a) => !pending.includes(a) && !upcoming.includes(a));
  const cfg = meetingConfigFrom(s ?? {});
  const free = computeAvailableSlots(cfg, list.filter((a) => ["confirmada", "aguardando_aprovacao"].includes(a.status)), (holidays ?? []).map((h) => h.holiday_date), now, 8);

  return (
    <>
      <PageHeader title="Reuniões" description="O agente oferece horários livres e registra o pedido do cliente. Somente uma pessoa da equipe confirma." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Aguardando confirmação (${pending.length})`} className="lg:col-span-2">
          {pending.length === 0 ? <p className="text-sm text-muted">Nenhum pedido pendente.</p> : (
            <ul className="space-y-3">
              {pending.map((a) => (
                <li key={a.id} className="rounded-lg border border-line p-3">
                  <Header a={a} />
                  {canOperate && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <ActionForm action={confirmMeeting} submitLabel="Confirmar" pendingLabel="Confirmando…">
                        <input type="hidden" name="id" value={a.id} />
                        {a.conversation_id && (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" name="notify" defaultChecked />Avisar o cliente pelo WhatsApp (se a janela de 24h estiver aberta)</label>
                            <Field label="Complemento da mensagem (opcional)"><input name="location_note" placeholder="O link da videochamada será enviado aqui." /></Field>
                          </div>
                        )}
                      </ActionForm>
                      <ActionForm action={updateMeetingStatus} submitLabel="Recusar / cancelar" variant="secondary">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="cancelada" />
                        <Field label="Motivo"><input name="reason" placeholder="Horário indisponível" /></Field>
                      </ActionForm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Próximos horários livres">
          {free.length === 0 ? <p className="text-sm text-muted">Nenhum horário livre no período configurado.</p> : (
            <ul className="space-y-1 text-sm">{free.map((d) => <li key={d.toISOString()}>{formatSlotPtBr(d, cfg.timezone)}</li>)}</ul>
          )}
          <p className="mt-3 text-xs text-muted">São estes (até 5) que o agente oferece ao cliente.</p>
        </Card>

        <Card title={`Confirmadas (${upcoming.length})`} className="lg:col-span-2">
          {upcoming.length === 0 ? <EmptyState title="Nenhuma reunião confirmada" /> : (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="rounded-lg border border-line p-3">
                  <Header a={a} />
                  {canOperate && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActionForm action={updateMeetingStatus} submitLabel="Marcar como realizada" variant="secondary">
                        <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="realizada" />
                      </ActionForm>
                      <ActionForm action={updateMeetingStatus} submitLabel="Cancelar" variant="secondary">
                        <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="cancelada" />
                      </ActionForm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canOperate && (
          <Card title="Nova reunião (combinada pela equipe)">
            <ActionForm action={createMeeting} submitLabel="Criar e confirmar" variant="secondary">
              <div className="space-y-3">
                <Field label="Contato"><input name="contact_name" required /></Field>
                <Field label="Data e hora (Brasília)"><input name="starts_at" type="datetime-local" required /></Field>
                <Field label="Duração (min)"><input name="duration" type="number" min={15} max={180} defaultValue={s?.meeting_duration_min ?? 30} /></Field>
                <Field label="Motivo"><input name="reason" /></Field>
              </div>
            </ActionForm>
          </Card>
        )}

        <Card title="Disponibilidade" className="lg:col-span-3">
          <ActionForm action={saveMeetingSettings} submitLabel="Salvar disponibilidade" variant="secondary">
            <fieldset disabled={!isAdmin} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-3 text-sm text-fg">
                {DAYS.map((d, i) => <label key={d} className="flex items-center gap-1"><input type="checkbox" name="meeting_days" value={i} defaultChecked={(s?.meeting_days ?? []).includes(i)} />{d}</label>)}
              </div>
              <Field label="Início"><input name="meeting_start" type="time" defaultValue={String(s?.meeting_start ?? "09:00").slice(0, 5)} /></Field>
              <Field label="Fim"><input name="meeting_end" type="time" defaultValue={String(s?.meeting_end ?? "17:00").slice(0, 5)} /></Field>
              <Field label="Duração (min)"><input name="meeting_duration_min" type="number" min={15} max={180} defaultValue={s?.meeting_duration_min} /></Field>
              <Field label="Intervalo entre reuniões (min)"><input name="meeting_buffer_min" type="number" min={0} max={120} defaultValue={s?.meeting_buffer_min} /></Field>
              <Field label="Máximo por dia"><input name="meeting_max_per_day" type="number" min={1} max={20} defaultValue={s?.meeting_max_per_day} /></Field>
              <Field label="Antecedência mínima (h)"><input name="meeting_min_notice_hours" type="number" min={0} max={168} defaultValue={s?.meeting_min_notice_hours} /></Field>
              <Field label="Oferecer até (dias)"><input name="meeting_horizon_days" type="number" min={1} max={60} defaultValue={s?.meeting_horizon_days} /></Field>
              <Field label="Formato/local"><input name="meeting_location" defaultValue={s?.meeting_location} /></Field>
            </fieldset>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Feriados cadastrados em Configurações também bloqueiam horários.</p>
        </Card>

        {past.length > 0 && (
          <Card title="Histórico recente" className="lg:col-span-3">
            <ul className="divide-y divide-line text-sm">
              {past.map((a) => <li key={a.id} className="py-2"><Header a={a} /></li>)}
            </ul>
          </Card>
        )}
      </div>
      {!canOperate && <div className="mt-4"><Notice>Somente operadores e administradores confirmam reuniões.</Notice></div>}
    </>
  );
}

function Header({ a }: { a: Appt }) {
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="font-medium">{fmtDateTime(a.starts_at)}</span> · {a.contact_name}
        {a.phone_e164 && <span className="text-muted"> · {formatBrPhone(a.phone_e164)}</span>}
        {a.companies && <> · <Link className="text-accent underline" href={`/empresas/${a.companies.id}`}>{a.companies.name}</Link></>}
        {a.conversation_id && <> · <Link className="text-accent underline" href={`/conversas/${a.conversation_id}`}>conversa</Link></>}
        {a.reason && <div className="text-xs text-muted">Motivo: {a.reason}</div>}
        {a.cancelled_reason && <div className="text-xs text-muted">{a.cancelled_reason}</div>}
      </div>
      <div className="flex gap-1">
        {a.requested_by_agent && <Badge tone="info">pedido via agente</Badge>}
        <Badge tone={STATUS[a.status]?.[0] ?? "neutral"}>{STATUS[a.status]?.[1] ?? a.status}</Badge>
      </div>
    </div>
  );
}
