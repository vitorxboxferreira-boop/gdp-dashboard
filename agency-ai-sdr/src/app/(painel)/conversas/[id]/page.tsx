import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBrPhone } from "@core/phone.ts";
import { closeConversation, markConversationRead, returnToAgent, takeOverConversation } from "@/actions/conversations";
import { suppressPhone } from "@/actions/consents";
import { ActionForm } from "@/components/action-form";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { whatsappSendConfigured } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONV_STATUS, type ConversationRow } from "@/lib/conversations";
import { Composer } from "./composer";

export const metadata = { title: "Conversa" };

interface MessageRow {
  id: string;
  direction: "inbound" | "outbound";
  sender: "cliente" | "agente" | "humano" | "sistema";
  message_type: string;
  body: string | null;
  status: string;
  error: string | null;
  created_at: string;
  wa_timestamp: string | null;
}

const SENDER: Record<MessageRow["sender"], string> = { cliente: "Cliente", agente: "Assistente virtual", humano: "Equipe", sistema: "Sistema" };
const STATUS_ICON: Record<string, string> = { pendente: "⏳", enviada: "✓", entregue: "✓✓", lida: "✓✓ lida", falhou: "falhou" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await requirePageRole("viewer");
  const canOperate = hasRole(profile, "operator");
  const supabase = await createSupabaseServerClient();

  const { data: convData } = await supabase
    .from("conversations")
    .select("id, phone_e164, contact_name, status, handled_by, agent_paused, unread_count, last_message_preview, last_inbound_at, service_window_expires_at, opted_out_at, human_requested_at, updated_at, lead_id, companies(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!convData) notFound();
  const c = convData as unknown as ConversationRow & { human_requested_at: string | null };

  if (canOperate && c.unread_count > 0) await markConversationRead(id);

  const [{ data: msgs }, { data: check }] = await Promise.all([
    supabase.from("messages").select("id, direction, sender, message_type, body, status, error, created_at, wa_timestamp").eq("conversation_id", id).order("created_at", { ascending: true }).limit(500),
    canOperate ? supabase.rpc("whatsapp_send_check", { p_conversation_id: id, p_sender: "humano", p_kind: "free_text" }) : Promise.resolve({ data: null }),
  ]);
  const messages = (msgs ?? []) as MessageRow[];
  const gate = check as { allowed: boolean; reasons: string[] } | null;
  const disabledReason = !whatsappSendConfigured()
    ? "credenciais de envio do WhatsApp não configuradas"
    : gate && !gate.allowed ? gate.reasons.join("; ") : null;
  const windowOpen = c.service_window_expires_at && new Date(c.service_window_expires_at).getTime() > Date.now();

  return (
    <>
      <PageHeader
        title={c.contact_name || formatBrPhone(c.phone_e164)}
        description={`${formatBrPhone(c.phone_e164)}${c.companies ? ` · ${c.companies.name}` : " · sem empresa vinculada"}`}
        actions={<><RealtimeRefresh table="messages" filter={`conversation_id=eq.${id}`} channel={`conv-${id}`} /><Link href="/conversas" className="text-sm text-accent underline">Voltar</Link></>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {c.opted_out_at && (
            <div className="mb-3"><Notice tone="danger" title="Contato descadastrado">Pediu para não receber mensagens em {fmtDateTime(c.opted_out_at)}. Número na lista de bloqueio.</Notice></div>
          )}
          {c.human_requested_at && c.handled_by === "humano" && (
            <div className="mb-3"><Notice tone="warn" title="Pediu atendimento humano">Em {fmtDateTime(c.human_requested_at)}. O agente está pausado nesta conversa.</Notice></div>
          )}
          <ol className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1" aria-label="Mensagens">
            {messages.length === 0 && <li className="text-sm text-muted">Sem mensagens.</li>}
            {messages.map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.direction === "inbound" ? "self-start bg-surface-2" : "self-end bg-info-bg"}`}>
                <div className="mb-0.5 text-[11px] text-muted">{SENDER[m.sender]} · {fmtDateTime(m.wa_timestamp ?? m.created_at)}</div>
                <div className="whitespace-pre-wrap break-words">{m.body ?? `[${m.message_type}]`}</div>
                {m.direction === "outbound" && (
                  <div className={`mt-0.5 text-right text-[11px] ${m.status === "falhou" ? "text-danger" : "text-muted"}`}>
                    {STATUS_ICON[m.status] ?? m.status}{m.error ? ` — ${m.error}` : ""}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {canOperate && (
            <div className="mt-4 border-t border-line pt-4">
              <Composer conversationId={id} disabledReason={disabledReason} />
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Situação">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={CONV_STATUS[c.status][1]}>{CONV_STATUS[c.status][0]}</Badge>
              <Badge tone={c.handled_by === "humano" ? "warn" : "info"}>{c.handled_by === "humano" ? "Humano" : "Agente"}</Badge>
              {c.agent_paused && <Badge tone="warn">Agente pausado</Badge>}
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Janela de 24h</dt><dd>{windowOpen ? `aberta até ${fmtDateTime(c.service_window_expires_at)}` : "fechada"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Última mensagem do cliente</dt><dd>{fmtDateTime(c.last_inbound_at)}</dd></div>
            </dl>
            {c.companies && <Link href={`/empresas/${c.companies.id}`} className="mt-3 inline-block text-sm text-accent underline">Abrir empresa</Link>}
            <p className="mt-3 text-xs text-muted">
              Fora da janela de 24h só é possível enviar template aprovado a contatos com autorização registrada (não implementado nesta fase).
              Responder dentro da janela não equivale a autorização para mensagens futuras iniciadas pela empresa.
            </p>
          </Card>

          {canOperate && c.status !== "encerrada" && (
            <Card title="Ações">
              <div className="flex flex-col gap-3">
                {c.handled_by === "agente" ? (
                  <ActionForm action={takeOverConversation} submitLabel="Assumir conversa (pausar agente)" variant="secondary">
                    <input type="hidden" name="conversation_id" value={id} />
                  </ActionForm>
                ) : !c.opted_out_at ? (
                  <ActionForm action={returnToAgent} submitLabel="Devolver ao agente" variant="secondary">
                    <input type="hidden" name="conversation_id" value={id} />
                  </ActionForm>
                ) : null}
                <ActionForm action={closeConversation} submitLabel="Encerrar conversa" variant="secondary">
                  <input type="hidden" name="conversation_id" value={id} />
                </ActionForm>
                {!c.opted_out_at && (
                  <ActionForm action={suppressPhone} submitLabel="Bloquear número" variant="danger">
                    <input type="hidden" name="phone" value={c.phone_e164} />
                    <Field label="Motivo"><input name="reason" required defaultValue="Pediu para não ser contatado" /></Field>
                  </ActionForm>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
