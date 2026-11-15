import Link from "next/link";
import { Badge, Card, EmptyState, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { fmtBRL, fmtDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Vendas" };

interface SaleRow {
  id: string; description: string; amount_cents: number; status: string; requested_by_agent: boolean; notes: string | null; created_at: string;
  conversation_id: string | null; companies: { id: string; name: string } | null;
}
const STATUS: Record<string, ["info" | "ok" | "danger" | "neutral" | "warn", string]> = {
  pendente_aprovacao: ["warn", "Aguardando aprovação"], aprovada: ["ok", "Aprovada"], rejeitada: ["danger", "Rejeitada"], paga: ["ok", "Paga"], cancelada: ["neutral", "Cancelada"],
};

export default async function SalesPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("sales")
    .select("id, description, amount_cents, status, requested_by_agent, notes, created_at, conversation_id, companies(id, name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as SaleRow[];
  return (
    <>
      <PageHeader title="Vendas" description="Oportunidades registradas quando o cliente declara que quer contratar. O agente nunca aprova, cobra ou confirma pagamento." />
      <div className="mb-4"><Notice tone="info">Fase 3: o agente Closer registra a oportunidade e transfere a conversa. O fluxo de aprovação e confirmação de pagamento chega na Fase 4 — até lá, trate pela conversa.</Notice></div>
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma oportunidade ainda" />
      ) : (
        <Card>
          <Table>
            <thead><tr><Th>Empresa</Th><Th>Valor</Th><Th>Situação</Th><Th>Origem</Th><Th>Necessidade</Th><Th>Criada</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    {r.companies ? <Link href={`/empresas/${r.companies.id}`} className="hover:underline">{r.companies.name}</Link> : "—"}
                    {r.conversation_id && <div><Link href={`/conversas/${r.conversation_id}`} className="text-xs text-accent underline">Ver conversa</Link></div>}
                  </Td>
                  <Td className="tabular-nums">{fmtBRL(r.amount_cents)}</Td>
                  <Td><Badge tone={STATUS[r.status]?.[0] ?? "neutral"}>{STATUS[r.status]?.[1] ?? r.status}</Badge></Td>
                  <Td>{r.requested_by_agent ? "Agente Closer" : "Equipe"}</Td>
                  <Td className="max-w-xs text-xs text-muted">{r.notes ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
