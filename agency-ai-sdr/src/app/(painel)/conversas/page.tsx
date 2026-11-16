import Link from "next/link";
import { formatBrPhone } from "@core/phone.ts";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { whatsappWebhookConfigured } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";
import { CONV_STATUS, type ConversationRow } from "@/lib/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Conversas" };

type SP = { status?: string };

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePageRole("viewer");
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("conversations")
    .select("id, phone_e164, contact_name, status, handled_by, agent_paused, unread_count, last_message_preview, last_inbound_at, service_window_expires_at, opted_out_at, updated_at, companies(id, name)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (sp.status && sp.status in CONV_STATUS) q = q.eq("status", sp.status);
  else q = q.neq("status", "encerrada");
  const { data } = await q;
  const rows = (data ?? []) as unknown as ConversationRow[];
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Conversas"
        description="Mensagens recebidas pela WhatsApp Cloud API oficial. Atualiza em tempo real."
        actions={<RealtimeRefresh table="conversations" channel="conversations-list" />}
      />
      {!whatsappWebhookConfigured() && (
        <div className="mb-4">
          <Notice tone="warn" title="Webhook não configurado">
            Defina WHATSAPP_APP_SECRET e WHATSAPP_WEBHOOK_VERIFY_TOKEN e registre a URL do webhook no app da Meta (veja Configurações → WhatsApp).
          </Notice>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/conversas" className={`rounded-lg border border-line px-3 py-1.5 ${!sp.status ? "bg-surface-2 font-medium" : ""}`}>Em andamento</Link>
        {Object.entries(CONV_STATUS).map(([k, [label]]) => (
          <Link key={k} href={`/conversas?status=${k}`} className={`rounded-lg border border-line px-3 py-1.5 ${sp.status === k ? "bg-surface-2 font-medium" : ""}`}>{label}</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma conversa">As conversas aparecem aqui quando um contato envia mensagem ao número da empresa.</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((c) => {
              const windowOpen = c.service_window_expires_at && new Date(c.service_window_expires_at).getTime() > now;
              return (
                <li key={c.id}>
                  <Link href={`/conversas/${c.id}`} className="flex flex-col gap-1 px-1 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{c.contact_name || formatBrPhone(c.phone_e164)}</span>
                        {c.unread_count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">{c.unread_count}</span>}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {c.companies?.name ? `${c.companies.name} · ` : ""}{c.last_message_preview ?? "—"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {c.opted_out_at && <Badge tone="danger">Descadastrado</Badge>}
                      <Badge tone={CONV_STATUS[c.status][1]}>{CONV_STATUS[c.status][0]}</Badge>
                      <Badge tone={windowOpen ? "ok" : "neutral"}>{windowOpen ? "Janela 24h aberta" : "Janela fechada"}</Badge>
                      <span className="text-xs text-muted">{fmtDateTime(c.updated_at)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
