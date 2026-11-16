import "server-only";
import { isSupabaseConfigured, publicEnv } from "./public-env";

export type AppEnv = "development" | "staging" | "production";

function read(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

/** Variáveis do servidor. Nunca importar em componentes de cliente. */
export const serverEnv = {
  appEnv: (read("APP_ENV") ?? "development") as AppEnv,
  supabaseServiceRoleKey: read("SUPABASE_SECRET_KEY") ?? read("SUPABASE_SERVICE_ROLE_KEY"),
  googlePlacesApiKey: read("GOOGLE_PLACES_API_KEY"),
  anthropicApiKey: read("ANTHROPIC_API_KEY"),
  anthropicModel: read("ANTHROPIC_MODEL") ?? "claude-opus-5-5",
  whatsappAccessToken: read("WHATSAPP_ACCESS_TOKEN"),
  whatsappPhoneNumberId: read("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappAppSecret: read("WHATSAPP_APP_SECRET"),
  whatsappVerifyToken: read("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
  whatsappGraphVersion: read("WHATSAPP_GRAPH_API_VERSION") ?? "v23.0",
  cronSecret: read("CRON_SECRET"),
};

export interface IntegrationStatus {
  key: "supabase" | "service_role" | "google_places" | "anthropic" | "whatsapp" | "cron";
  label: string;
  configured: boolean;
  phase: number;
  detail: string;
}

/**
 * Detecta mistura de ambientes: em produção, recusa URLs locais e exige APP_ENV coerente.
 * Retorna mensagens de alerta (exibidas no painel).
 */
export function environmentWarnings(): string[] {
  const warnings: string[] = [];
  const url = publicEnv.supabaseUrl;
  const isLocalUrl = /localhost|127\.0\.0\.1/.test(url);
  if (serverEnv.appEnv === "production" && isLocalUrl) {
    warnings.push("APP_ENV=production mas NEXT_PUBLIC_SUPABASE_URL aponta para um Supabase local.");
  }
  if (serverEnv.appEnv !== "production" && process.env.VERCEL_ENV === "production") {
    warnings.push("Deploy de produção na Vercel com APP_ENV diferente de production: verifique as variáveis.");
  }
  if (process.env.HEALTHCHECK_TOKEN && process.env.HEALTHCHECK_TOKEN.length < 32) {
    warnings.push("HEALTHCHECK_TOKEN deve ter pelo menos 32 caracteres.");
  }
  if (serverEnv.appEnv === "production" && !serverEnv.supabaseServiceRoleKey) {
    warnings.push("Produção sem SUPABASE_SECRET_KEY: agentes e webhook não funcionarão.");
  }
  if (serverEnv.cronSecret && serverEnv.cronSecret.length < 32) {
    warnings.push("CRON_SECRET deve ter pelo menos 32 caracteres.");
  }
  return warnings;
}

export function integrationStatuses(): IntegrationStatus[] {
  return [
    {
      key: "supabase",
      label: "Supabase (banco e autenticação)",
      configured: isSupabaseConfigured,
      phase: 1,
      detail: isSupabaseConfigured ? "URL e chave pública configuradas" : "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    },
    {
      key: "service_role",
      label: "Chave de servidor do Supabase",
      configured: Boolean(serverEnv.supabaseServiceRoleKey),
      phase: 1,
      detail: serverEnv.supabaseServiceRoleKey
        ? "Configurada (usada apenas no servidor para executar os agentes)"
        : "Defina SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) para executar pesquisas pelo painel",
    },
    {
      key: "google_places",
      label: "Google Places API (New)",
      configured: Boolean(serverEnv.googlePlacesApiKey),
      phase: 1,
      detail: serverEnv.googlePlacesApiKey
        ? "Chave configurada. A integração só é usada após habilitação explícita nas Configurações."
        : "Defina GOOGLE_PLACES_API_KEY (servidor e Edge Function). Integração não testada contra a API real.",
    },
    {
      key: "anthropic",
      label: "Anthropic (modelo de IA)",
      configured: Boolean(serverEnv.anthropicApiKey),
      phase: 3,
      detail: "Prevista para a Fase 3 (agentes SDR e Closer). Nenhuma chamada é feita nesta fase.",
    },
    {
      key: "whatsapp",
      label: "WhatsApp Business Platform (Cloud API)",
      configured: whatsappSendConfigured() && whatsappWebhookConfigured(),
      phase: 2,
      detail: whatsappStatusDetail(),
    },
    {
      key: "cron",
      label: "Rotinas programadas (Supabase Cron)",
      configured: Boolean(serverEnv.cronSecret),
      phase: 5,
      detail: "Ativação manual via supabase/sql/activate_cron.sql (Fase 5).",
    },
  ];
}

/** Recebimento: exige app secret (assinatura) e verify token. */
export function whatsappWebhookConfigured(): boolean {
  return Boolean(serverEnv.whatsappAppSecret && serverEnv.whatsappVerifyToken);
}

/** Envio: exige token de acesso e ID do número. */
export function whatsappSendConfigured(): boolean {
  return Boolean(serverEnv.whatsappAccessToken && serverEnv.whatsappPhoneNumberId);
}

function whatsappStatusDetail(): string {
  const missing = [
    !serverEnv.whatsappAppSecret && "WHATSAPP_APP_SECRET",
    !serverEnv.whatsappVerifyToken && "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    !serverEnv.whatsappAccessToken && "WHATSAPP_ACCESS_TOKEN",
    !serverEnv.whatsappPhoneNumberId && "WHATSAPP_PHONE_NUMBER_ID",
  ].filter(Boolean);
  if (missing.length) return `Defina ${missing.join(", ")}. Integração não testada contra a Meta.`;
  return `Credenciais presentes (Graph API ${serverEnv.whatsappGraphVersion}). Valide com o número de teste da Meta antes de desligar o modo de teste.`;
}
