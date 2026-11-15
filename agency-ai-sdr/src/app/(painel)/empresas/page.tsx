import Link from "next/link";
import { formatBrPhone } from "@core/phone.ts";
import { ContactBadge, DemoBadge, PriorityBadge, WebsiteBadge } from "@/components/badges";
import { RunSearchButton } from "@/components/run-buttons";
import { ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { fmtDateTime, PRIORITY_LABELS, websiteLabel } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyRow, LeadRow } from "@/lib/types";

export const metadata = { title: "Empresas" };
export const maxDuration = 60;

const PAGE = 25;
const WEBSITE = ["not_identified", "social_only", "verified_none", "identified", "verified_exists"] as const;
const PRIORITIES = ["alta", "media", "baixa", "verificar"] as const;

type SP = { q?: string; site?: string; prioridade?: string; origem?: string; page?: string };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await requirePageRole("viewer");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();

  const leadEmbed = sp.prioridade && (PRIORITIES as readonly string[]).includes(sp.prioridade)
    ? "leads!inner(id, priority, score, contact_status, stage)"
    : "leads(id, priority, score, contact_status, stage)";
  let query = supabase
    .from("companies")
    .select(`id, name, category_label, primary_category, city, state, phone_e164, phone_national, website_status, is_demo, source, discovered_at, ${leadEmbed}`, { count: "exact" })
    .order("discovered_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);

  if (sp.q) query = query.ilike("name", `%${sp.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (sp.site && (WEBSITE as readonly string[]).includes(sp.site)) query = query.eq("website_status", sp.site);
  if (leadEmbed.includes("!inner")) query = query.eq("leads.priority", sp.prioridade!);
  if (sp.origem === "real") query = query.eq("is_demo", false);
  if (sp.origem === "demo") query = query.eq("is_demo", true);

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Array<CompanyRow & { leads: Pick<LeadRow, "id" | "priority" | "score" | "contact_status" | "stage"> | null }>;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/empresas?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Empresas descobertas pelo agente Scout (Google Places) ou cadastradas manualmente. “Site não identificado” não é prova de ausência de site."
        actions={hasRole(profile, "operator") ? <><RunSearchButton /><ButtonLink href="/empresas/nova">Adicionar manualmente</ButtonLink></> : undefined}
      />

      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <input name="q" placeholder="Buscar por nome" defaultValue={sp.q ?? ""} aria-label="Buscar por nome" />
          <select name="site" defaultValue={sp.site ?? ""} aria-label="Situação do site">
            <option value="">Site: todos</option>
            {WEBSITE.map((w) => <option key={w} value={w}>{websiteLabel(w)}</option>)}
          </select>
          <select name="prioridade" defaultValue={sp.prioridade ?? ""} aria-label="Prioridade">
            <option value="">Prioridade: todas</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
          <select name="origem" defaultValue={sp.origem ?? ""} aria-label="Origem">
            <option value="">Origem: todas</option>
            <option value="real">Somente reais</option>
            <option value="demo">Somente demonstrativas</option>
          </select>
          <button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg">Filtrar</button>
        </form>
      </Card>

      {error && <p className="mb-4 text-sm text-danger">Erro ao carregar empresas.</p>}

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma empresa encontrada">Ajuste os filtros ou execute uma pesquisa.</EmptyState>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr><Th>Empresa</Th><Th>Cidade</Th><Th>Telefone</Th><Th>Site</Th><Th>Pontuação</Th><Th>Contato</Th><Th>Descoberta</Th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <Td>
                    <Link href={`/empresas/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      {c.is_demo && <DemoBadge />} {c.category_label ?? c.primary_category ?? "—"}
                    </div>
                  </Td>
                  <Td>{c.city ? `${c.city}/${c.state ?? ""}` : "—"}</Td>
                  <Td className="whitespace-nowrap">{c.phone_e164 ? formatBrPhone(c.phone_e164) : c.phone_national ?? "—"}</Td>
                  <Td><WebsiteBadge status={c.website_status} /></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="w-7 tabular-nums">{c.leads?.score ?? "—"}</span>
                      <PriorityBadge priority={c.leads?.priority ?? null} />
                    </div>
                  </Td>
                  <Td>{c.leads ? <ContactBadge status={c.leads.contact_status} /> : "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(c.discovered_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{count ?? 0} empresas · página {page} de {pages}</span>
            <span className="flex gap-2">
              {page > 1 && <Link className="underline" href={qs(page - 1)}>Anterior</Link>}
              {page < pages && <Link className="underline" href={qs(page + 1)}>Próxima</Link>}
            </span>
          </div>
        </Card>
      )}
    </>
  );
}
