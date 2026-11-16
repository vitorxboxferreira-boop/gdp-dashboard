import Link from "next/link";
import { createSale, decideSale } from "@/actions/sales";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, PageHeader, StatCard } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { fmtBRL, fmtDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Vendas" };

interface SaleRow {
  id: string; description: string; amount_cents: number; status: string; requested_by_agent: boolean; notes: string | null; created_at: string;
  approved_at: string | null; payment_confirmed_at: string | null; rejected_reason: string | null; conversation_id: string | null;
  companies: { id: string; name: string } | null;
}
const STATUS: Record<string, ["info" | "ok" | "danger" | "neutral" | "warn", string]> = {
  pendente_aprovacao: ["warn", "Aguardando aprovação"], aprovada: ["info", "Aprovada — aguardando pagamento"], rejeitada: ["danger", "Rejeitada"], paga: ["ok", "Paga"], cancelada: ["neutral", "Cancelada"],
};

export default async function SalesPage() {
  const profile = await requirePageRole("viewer");
  const isAdmin = hasRole(profile, "admin");
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: s }] = await Promise.all([
    supabase.from("sales")
      .select("id, description, amount_cents, status, requested_by_agent, notes, created_at, approved_at, payment_confirmed_at, rejected_reason, conversation_id, companies(id, name)")
      .order("created_at", { ascending: false }).limit(200),
    supabase.from("agent_settings").select("offer").eq("id", 1).single(),
  ]);
  const rows = (data ?? []) as unknown as SaleRow[];
  const sum = (st: string) => rows.filter((r) => r.status === st).reduce((a, r) => a + r.amount_cents, 0);
  const price = (s?.offer as { price_cents?: number } | null)?.price_cents ?? 25000;

  return (
    <>
      <PageHeader title="Vendas" description="O agente registra a oportunidade; a aprovação, a confirmação de pagamento e o cancelamento são sempre humanos (garantido no banco)." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Aguardando aprovação" value={rows.filter((r) => r.status === "pendente_aprovacao").length} hint={fmtBRL(sum("pendente_aprovacao"))} tone="warn" />
        <StatCard label="Aprovadas (a receber)" value={rows.filter((r) => r.status === "aprovada").length} hint={fmtBRL(sum("aprovada"))} />
        <StatCard label="Receita confirmada" value={fmtBRL(sum("paga"))} tone="ok" />
        <StatCard label="Rejeitadas/canceladas" value={rows.filter((r) => ["rejeitada", "cancelada"].includes(r.status)).length} />
      </div>

      {rows.length === 0 ? <EmptyState title="Nenhuma oportunidade ainda" /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-sm">
                  <div className="font-medium">{r.companies ? <Link href={`/empresas/${r.companies.id}`} className="hover:underline">{r.companies.name}</Link> : "Sem empresa vinculada"} · {fmtBRL(r.amount_cents)}</div>
                  <div className="text-xs text-muted">{r.description} · {r.requested_by_agent ? "via agente Closer" : "registrada pela equipe"} · {fmtDateTime(r.created_at)}</div>
                  {r.notes && <p className="mt-1 text-xs text-muted">Necessidade: {r.notes}</p>}
                  {r.rejected_reason && <p className="mt-1 text-xs text-danger">{r.rejected_reason}</p>}
                  {r.conversation_id && <Link href={`/conversas/${r.conversation_id}`} className="text-xs text-accent underline">Ver conversa</Link>}
                </div>
                <Badge tone={STATUS[r.status]?.[0] ?? "neutral"}>{STATUS[r.status]?.[1] ?? r.status}</Badge>
              </div>
              {isAdmin && r.status === "pendente_aprovacao" && (
                <div className="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-2">
                  <ActionForm action={decideSale} submitLabel="Aprovar">
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="aprovar" />
                    <Field label="Valor final (R$)" hint="Altere só se negociado pela equipe"><input name="amount" defaultValue={(r.amount_cents / 100).toFixed(2).replace(".", ",")} /></Field>
                  </ActionForm>
                  <ActionForm action={decideSale} submitLabel="Rejeitar" variant="secondary">
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="rejeitar" />
                    <Field label="Motivo"><input name="reason" required /></Field>
                  </ActionForm>
                </div>
              )}
              {isAdmin && r.status === "aprovada" && (
                <div className="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-2">
                  <ActionForm action={decideSale} submitLabel="Confirmar pagamento">
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="pago" />
                    <label className="flex items-start gap-2 text-sm text-fg"><input type="checkbox" name="confirm" required className="mt-1" />Verifiquei o recebimento no extrato/meio de pagamento.</label>
                  </ActionForm>
                  <ActionForm action={decideSale} submitLabel="Cancelar venda" variant="secondary">
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="cancelar" />
                    <Field label="Motivo"><input name="reason" /></Field>
                  </ActionForm>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {hasRole(profile, "operator") && (
        <Card title="Registrar oportunidade manualmente" className="mt-4">
          <ActionForm action={createSale} submitLabel="Registrar" variant="secondary">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Descrição"><input name="description" required defaultValue="Site profissional (oferta padrão)" /></Field>
              <Field label="Valor (R$)"><input name="amount" required defaultValue={(price / 100).toFixed(2).replace(".", ",")} /></Field>
              <Field label="ID da empresa (opcional)" hint="Copie da URL da empresa"><input name="company_id" /></Field>
            </div>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
