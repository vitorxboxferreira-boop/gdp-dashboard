// Rótulos e ordem das métricas de relatório (usados na página e no CSV).
export const REPORT_FIELDS: Array<[key: string, label: string, kind?: "brl" | "usd"]> = [
  ["companies_found", "Empresas encontradas"],
  ["companies_without_site", "Sem site próprio identificado"],
  ["leads_qualified", "Leads qualificados"],
  ["authorized_contacts_new", "Novas autorizações de contato"],
  ["conversations_new", "Novas conversas"],
  ["messages_received", "Mensagens recebidas"],
  ["agent_replies", "Respostas do agente"],
  ["team_messages", "Mensagens da equipe"],
  ["templates_sent", "Templates enviados"],
  ["handoffs", "Transferências para humano"],
  ["opt_outs", "Descadastros"],
  ["meetings_requested", "Reuniões pedidas"],
  ["meetings_confirmed", "Reuniões confirmadas"],
  ["opportunities", "Oportunidades"],
  ["sales_approved", "Vendas aprovadas"],
  ["sales_paid", "Vendas pagas"],
  ["revenue_cents", "Receita confirmada", "brl"],
  ["cost_places_usd", "Custo Google Places (estimado)", "usd"],
  ["cost_ai_usd", "Custo IA (estimado)", "usd"],
  ["cost_whatsapp_usd", "Custo WhatsApp (estimado)", "usd"],
  ["ai_tokens", "Tokens de IA"],
];

export function parsePeriod(from?: string, to?: string, today = new Date()): { from: string; to: string } {
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const t = valid(to) ?? fmt(today);
  const f = valid(from) ?? fmt(new Date(new Date(`${t}T12:00:00Z`).getTime() - 6 * 86_400_000));
  return f <= t ? { from: f, to: t } : { from: t, to: f };
}
