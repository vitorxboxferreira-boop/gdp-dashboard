import { WEBSITE_STATUS_LABELS, type WebsiteStatus } from "@core/website.ts";
import type { ContactStatus, LeadPriority, LeadStage } from "./types";

const TZ = "America/Sao_Paulo";

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short" }).format(d);
}

export function fmtBRL(cents: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents ?? 0) / 100);
}

export function fmtUSD(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value ?? 0));
}

export function fmtInt(n: number | string | null | undefined): string {
  return new Intl.NumberFormat("pt-BR").format(Number(n ?? 0));
}

export const websiteLabel = (s: WebsiteStatus) => WEBSITE_STATUS_LABELS[s] ?? s;

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  alta: "Alta prioridade",
  media: "Média prioridade",
  baixa: "Baixa prioridade",
  verificar: "Necessita verificação",
};

export const CONTACT_LABELS: Record<ContactStatus, string> = {
  nao_contatavel: "Não contatável (sem autorização)",
  elegivel: "Autorizado (WhatsApp)",
  bloqueado: "Bloqueado / descadastrado",
  demo: "Demonstrativo — nunca contatar",
};

export const STAGE_LABELS: Record<LeadStage, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  contatado: "Contatado",
  em_conversa: "Em conversa",
  interessado: "Interessado",
  reuniao: "Reunião",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
  descartado: "Descartado",
};

export const ROLE_LABELS = { pending: "Sem acesso", viewer: "Leitura", operator: "Operador", admin: "Administrador" } as const;
