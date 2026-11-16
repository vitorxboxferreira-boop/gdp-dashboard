import Link from "next/link";
import { formatBrPhone } from "@core/phone.ts";
import { ContactBadge, DemoBadge, PriorityBadge, StageBadge, WebsiteBadge } from "@/components/badges";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { CONTACT_LABELS, fmtDateTime, PRIORITY_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyRow, LeadRow } from "@/lib/types";

export const metadata = { title: "Leads" };

type SP = { prioridade?: string; contato?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePageRole("viewer");
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("leads")
    .select("id, score, priority, stage, contact_status, scored_at, is_demo, companies(id, name, city, phone_e164, website_status, category_label)")
    .not("score", "is", null)
    .order("priority", { ascending: true })
    .order("score", { ascending: false })
    .limit(200);
  if (sp.prioridade && sp.prioridade in PRIORITY_LABELS) q = q.eq("priority", sp.prioridade);
  if (sp.contato && sp.contato in CONTACT_LABELS) q = q.eq("contact_status", sp.contato);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Array<LeadRow & { companies: Pick<CompanyRow, "id" | "name" | "city" | "phone_e164" | "website_status" | "category_label"> }>;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Empresas pontuadas pelo agente Analyst, ordenadas por prioridade. Somente contatos com autorização válida podem receber mensagens pelo WhatsApp."
      />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <select name="prioridade" defaultValue={sp.prioridade ?? ""} aria-label="Prioridade">
            <option value="">Prioridade: todas</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select name="contato" defaultValue={sp.contato ?? ""} aria-label="Situação de contato">
            <option value="">Contato: todos</option>
            {Object.entries(CONTACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg">Filtrar</button>
        </form>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="Nenhum lead pontuado">Execute uma pesquisa ou reanálise.</EmptyState>
      ) : (
        <Card>
          <Table>
            <thead><tr><Th>Empresa</Th><Th>Pontos</Th><Th>Prioridade</Th><Th>Site</Th><Th>Etapa</Th><Th>WhatsApp</Th><Th>Analisado</Th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-surface-2">
                  <Td>
                    <Link href={`/empresas/${l.companies.id}`} className="font-medium hover:underline">{l.companies.name}</Link>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      {l.is_demo && <DemoBadge />}
                      {[l.companies.category_label, l.companies.city, l.companies.phone_e164 && formatBrPhone(l.companies.phone_e164)].filter(Boolean).join(" · ")}
                    </div>
                  </Td>
                  <Td className="tabular-nums">{l.score}</Td>
                  <Td><PriorityBadge priority={l.priority} /></Td>
                  <Td><WebsiteBadge status={l.companies.website_status} /></Td>
                  <Td><StageBadge stage={l.stage} /></Td>
                  <Td><ContactBadge status={l.contact_status} /></Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(l.scored_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
