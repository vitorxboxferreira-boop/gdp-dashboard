import Link from "next/link";
import { markNotificationsRead } from "@/actions/notifications";
import { ActionForm } from "@/components/action-form";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { safeInternalPath } from "@/lib/safe-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Notificações" };

const KIND: Record<string, ["warn" | "ok" | "danger" | "info" | "neutral", string]> = {
  handoff: ["warn", "Atendimento humano"], oportunidade: ["ok", "Oportunidade"], reuniao: ["info", "Reunião"],
  descadastro: ["neutral", "Descadastro"], relatorio: ["info", "Relatório"], falha: ["danger", "Falha"], limite: ["warn", "Limite"],
};

export default async function NotificationsPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <>
      <PageHeader
        title="Notificações"
        description="Eventos que pedem atenção da equipe. Atualiza em tempo real."
        actions={<>
          <RealtimeRefresh table="notifications" channel="notifications-page" />
          {unread > 0 && <ActionForm action={markNotificationsRead} submitLabel="Marcar todas como lidas" variant="secondary" />}
        </>}
      />
      {rows.length === 0 ? <EmptyState title="Nenhuma notificação" /> : (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${n.read_at ? "opacity-60" : ""}`}>
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={KIND[n.kind]?.[0] ?? "neutral"}>{KIND[n.kind]?.[1] ?? n.kind}</Badge>
                    <span className="font-medium">{n.title}</span>
                  </div>
                  {n.body && <div className="mt-0.5 truncate text-xs text-muted">{n.body}</div>}
                  <div className="text-xs text-muted">{fmtDateTime(n.created_at)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {safeInternalPath(n.link) && <Link href={safeInternalPath(n.link)!} className="text-sm text-accent underline">Abrir</Link>}
                  {!n.read_at && (
                    <ActionForm action={markNotificationsRead} submitLabel="Lida" variant="secondary">
                      <input type="hidden" name="id" value={n.id} />
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
