export interface ConversationRow {
  id: string;
  phone_e164: string;
  contact_name: string | null;
  status: "aberta" | "aguardando_cliente" | "humano" | "encerrada";
  handled_by: "agente" | "humano";
  agent_paused: boolean;
  unread_count: number;
  last_message_preview: string | null;
  last_inbound_at: string | null;
  service_window_expires_at: string | null;
  opted_out_at: string | null;
  updated_at: string;
  companies: { id: string; name: string } | null;
}

export const CONV_STATUS: Record<ConversationRow["status"], [string, "info" | "warn" | "ok" | "neutral"]> = {
  aberta: ["Aberta", "info"],
  aguardando_cliente: ["Aguardando cliente", "neutral"],
  humano: ["Atendimento humano", "warn"],
  encerrada: ["Encerrada", "neutral"],
};

