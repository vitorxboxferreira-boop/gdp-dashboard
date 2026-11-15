import type { WebsiteStatus } from "@core/website.ts";

export type Role = "pending" | "viewer" | "operator" | "admin";
export type LeadPriority = "alta" | "media" | "baixa" | "verificar";
export type ContactStatus = "nao_contatavel" | "elegivel" | "bloqueado" | "demo";
export type LeadStage =
  | "novo" | "qualificado" | "contatado" | "em_conversa" | "interessado"
  | "reuniao" | "proposta" | "ganho" | "perdido" | "descartado";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

export interface CompanyRow {
  id: string;
  place_id: string | null;
  source: "google_places" | "manual" | "demo";
  is_demo: boolean;
  name: string;
  primary_category: string | null;
  category_label: string | null;
  types: string[];
  formatted_address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  phone_national: string | null;
  phone_e164: string | null;
  website_uri: string | null;
  website_status: WebsiteStatus;
  website_verified_at: string | null;
  google_maps_uri: string | null;
  business_status: string | null;
  rating: number | null;
  user_rating_count: number | null;
  discovered_at: string;
  last_seen_at: string;
  places_data_expires_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ScoreReasonJson {
  criterion: string;
  points: number;
  detail: string;
}

export interface LeadRow {
  id: string;
  company_id: string;
  is_demo: boolean;
  score: number | null;
  priority: LeadPriority | null;
  score_reasons: { reasons?: ScoreReasonJson[]; needs_verification?: string[] } | [];
  scored_at: string | null;
  stage: LeadStage;
  contact_status: ContactStatus;
  eligibility_reasons: string[];
  eligibility_checked_at: string | null;
}

export interface Offer {
  product_name: string;
  price_cents: number;
  currency: string;
  includes: string[];
  not_included: string[];
  max_discount_percent: number;
  payment_terms: string;
  delivery_time: string;
}

export interface SettingsRow {
  automation_paused: boolean;
  paused_reason: string | null;
  paused_at: string | null;
  autopilot_enabled: boolean;
  timezone: string;
  run_on_weekends: boolean;
  run_on_holidays: boolean;
  daily_company_limit: number;
  places_daily_request_limit: number;
  ai_daily_token_limit: number;
  whatsapp_daily_message_limit: number;
  places_enabled: boolean;
  ai_enabled: boolean;
  whatsapp_enabled: boolean;
  places_cost_per_request_usd: number;
  ai_cost_per_mtok_input_usd: number;
  ai_cost_per_mtok_output_usd: number;
  whatsapp_cost_per_message_usd: number;
  offer: Offer;
  category_weights: Record<string, number>;
  scoring_thresholds: { alta: number; media: number };
  data_retention_days: number;
  places_content_ttl_days: number;
  whatsapp_test_mode: boolean;
  whatsapp_test_numbers: string[];
  opt_out_keywords: string[];
  human_request_keywords: string[];
  agency_name: string;
  assistant_name: string;
  ai_effort: "low" | "medium" | "high";
  ai_max_replies_per_conversation_day: number;
  agent_hours_start: string;
  agent_hours_end: string;
  agent_days: number[];
  updated_at: string;
}
