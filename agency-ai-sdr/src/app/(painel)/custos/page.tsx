import { Card, EmptyState, Notice, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { fmtDate, fmtInt, fmtUSD } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Custos e limites" };

interface UsageDaily { usage_date: string; provider: string; calls: number; units: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number; failures: number }
const PROVIDERS: Record<string, string> = { google_places: "Google Places", anthropic: "Modelo de IA (Anthropic)", whatsapp: "WhatsApp" };

export default async function CostsPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const [{ data: s }, { data: usage }] = await Promise.all([
    supabase.from("agent_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("usage_daily").select("*").order("usage_date", { ascending: false }).limit(90),
  ]);
  const rows = (usage ?? []) as UsageDaily[];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const t = (p: string) => rows.find((r) => r.usage_date === today && r.provider === p);
  const monthPrefix = today.slice(0, 7);
  const month = rows.filter((r) => r.usage_date.startsWith(monthPrefix)).reduce((a, r) => a + Number(r.estimated_cost_usd), 0);

  return (
    <>
      <PageHeader title="Custos e limites" description="Consumo registrado por chamada. Valores são ESTIMATIVAS com base nos preços configurados — confira sempre a fatura oficial de cada provedor." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Google Places hoje" value={`${fmtInt(t("google_places")?.calls)} / ${s?.places_daily_request_limit ?? "—"}`} hint="requisições / limite diário" />
        <StatCard label="Tokens de IA hoje" value={`${fmtInt(Number(t("anthropic")?.input_tokens ?? 0) + Number(t("anthropic")?.output_tokens ?? 0))} / ${fmtInt(s?.ai_daily_token_limit)}`} hint="Fase 3" />
        <StatCard label="Mensagens WhatsApp hoje" value={`${fmtInt(t("whatsapp")?.calls)} / ${s?.whatsapp_daily_message_limit ?? "—"}`} hint="Fase 2" />
        <StatCard label="Custo estimado no mês" value={fmtUSD(month)} />
      </div>
      <div className="mt-4">
        <Notice tone="warn" title="Nenhum serviço pago é ativado automaticamente">
          Google Places: {fmtUSD(s?.places_cost_per_request_usd)} por requisição (estimativa configurável). Com o limite atual de{" "}
          {s?.places_daily_request_limit} requisições/dia, o custo máximo estimado é {fmtUSD(Number(s?.places_cost_per_request_usd ?? 0) * Number(s?.places_daily_request_limit ?? 0))}/dia.
          A integração só roda após habilitação explícita do administrador. Verifique créditos gratuitos e preços atuais em cloud.google.com/maps-platform/pricing.
        </Notice>
      </div>
      <Card title="Histórico diário" className="mt-4">
        {rows.length === 0 ? (
          <EmptyState title="Nenhum consumo registrado" />
        ) : (
          <Table>
            <thead><tr><Th>Data</Th><Th>Serviço</Th><Th>Chamadas</Th><Th>Falhas</Th><Th>Tokens (entrada/saída)</Th><Th>Custo estimado</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.usage_date}-${r.provider}`}>
                  <Td>{fmtDate(r.usage_date)}</Td>
                  <Td>{PROVIDERS[r.provider] ?? r.provider}</Td>
                  <Td className="tabular-nums">{fmtInt(r.calls)}</Td>
                  <Td className="tabular-nums">{fmtInt(r.failures)}</Td>
                  <Td className="tabular-nums">{r.provider === "anthropic" ? `${fmtInt(r.input_tokens)} / ${fmtInt(r.output_tokens)}` : "—"}</Td>
                  <Td className="tabular-nums">{fmtUSD(r.estimated_cost_usd)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
