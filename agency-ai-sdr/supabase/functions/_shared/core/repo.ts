// Contrato de acesso a dados usado pelos agentes. Implementações:
//   * SupabaseRepo (produção, via supabase-js com service_role)
//   * MemoryRepo   (testes automatizados)

import type { CompanyDraft, SearchArea } from "./places.ts";
import type { ScoreResult, ScoringInput } from "./scoring.ts";
import type { PipelineStep } from "./schedule.ts";
import type { ChatMessage, KnowledgeEntry, Offer } from "./sdr-agent.ts";
import type { WebsiteStatus } from "./website.ts";

export interface AgentSettings {
  automation_paused: boolean;
  autopilot_enabled: boolean;
  timezone: string;
  run_on_weekends: boolean;
  run_on_holidays: boolean;
  daily_company_limit: number;
  places_daily_request_limit: number;
  places_enabled: boolean;
  places_cost_per_request_usd: number;
  places_content_ttl_days: number;
  category_weights: Record<string, number>;
  scoring_thresholds: { alta: number; media: number };
  // Fase 3 — IA
  ai_enabled?: boolean;
  ai_daily_token_limit?: number;
  ai_effort?: "low" | "medium" | "high";
  ai_max_replies_per_conversation_day?: number;
  ai_cost_per_mtok_input_usd?: number;
  ai_cost_per_mtok_output_usd?: number;
  agent_hours_start?: string;
  agent_hours_end?: string;
  agent_days?: number[];
  agency_name?: string;
  assistant_name?: string;
  meeting_days?: number[];
  meeting_start?: string;
  meeting_end?: string;
  meeting_duration_min?: number;
  meeting_buffer_min?: number;
  meeting_max_per_day?: number;
  meeting_min_notice_hours?: number;
  meeting_horizon_days?: number;
  meeting_location?: string;
  offer?: Offer;
}

export type UsageProvider = "google_places" | "anthropic" | "whatsapp";

export interface UsageEventInput {
  provider: UsageProvider;
  operation: string;
  units: number;
  estimated_cost_usd: number;
  input_tokens?: number;
  output_tokens?: number;
  success: boolean;
  usage_date: string;
  campaign_id?: string | null;
  job_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CompanyInsert extends CompanyDraft {
  search_area_id: string | null;
  campaign_id: string | null;
  places_data_expires_at: string;
}

export interface CompanyForScoring extends ScoringInput {
  id: string;
}

export interface Campaign {
  id: string;
  campaign_date: string;
  trigger: "cron" | "manual";
  status: "agendada" | "em_execucao" | "concluida" | "falhou" | "cancelada";
  stats: Record<string, unknown>;
}

export type JobKind = PipelineStep | "maintenance.retention" | "sdr.reply";
export type JobStatus = "queued" | "running" | "done" | "failed" | "dead" | "cancelled";

export interface Job {
  id: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  campaign_id: string | null;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
}

export interface JobInsert {
  kind: JobKind;
  payload?: Record<string, unknown>;
  campaign_id: string | null;
  run_after: string;
  idempotency_key: string;
  max_attempts?: number;
}

export interface Repo {
  getSettings(): Promise<AgentSettings>;
  getHolidays(): Promise<string[]>;

  listActiveAreas(): Promise<SearchArea[]>;
  updateAreaCursor(areaId: string, cursor: number): Promise<void>;

  countUsage(provider: UsageProvider, usageDate: string): Promise<number>;
  recordUsage(event: UsageEventInput): Promise<void>;

  countCompaniesDiscoveredSince(sinceIso: string): Promise<number>;
  findCompanyByPlaceId(placeId: string): Promise<{ id: string; website_status: WebsiteStatus } | null>;
  findCompanyByPhone(phoneE164: string): Promise<{ id: string } | null>;
  refreshCompanyFromPlaces(id: string, patch: Partial<CompanyInsert>): Promise<void>;
  /** Retorna null se a inserção violou alguma restrição de unicidade (duplicata). */
  insertCompany(company: CompanyInsert): Promise<{ id: string } | null>;

  listCompaniesToScore(limit: number): Promise<CompanyForScoring[]>;
  saveLeadScore(companyId: string, result: ScoreResult): Promise<void>;
  classifyLeads(): Promise<Record<string, number>>;
  refreshEligibility(): Promise<Record<string, number>>;

  findCronCampaign(date: string): Promise<Campaign | null>;
  /** Retorna null quando já existe campanha automática no dia (idempotência). */
  createCampaign(input: { campaign_date: string; trigger: "cron" | "manual"; created_by?: string | null }): Promise<Campaign | null>;
  updateCampaign(id: string, patch: Partial<Omit<Campaign, "id">> & { started_at?: string; finished_at?: string; error?: string | null }): Promise<void>;
  getCampaign(id: string): Promise<Campaign | null>;

  enqueueJobs(jobs: JobInsert[]): Promise<void>;
  claimJobs(worker: string, limit: number, kinds?: JobKind[]): Promise<Job[]>;
  completeJob(id: string, result: Record<string, unknown>): Promise<void>;
  failJob(id: string, error: string, retry: boolean): Promise<string>;
  deferJob(id: string, seconds: number, note: string): Promise<void>;
  getJobStatus(campaignId: string, kind: JobKind): Promise<JobStatus | null>;
  listCampaignJobs(campaignId: string): Promise<Array<{ kind: JobKind; status: JobStatus; result: unknown; last_error: string | null }>>;

  dashboardMetrics(): Promise<Record<string, unknown>>;
  reportMetrics(from: string, to: string): Promise<Record<string, unknown>>;
  /** Alerta para a equipe, no máximo uma vez por dia por chave. */
  notifyLimitOnce(key: string, title: string, body: string): Promise<void>;
  recordHeartbeat(component: "agent_runner" | "whatsapp_webhook" | "panel_agents", ok: boolean, details: Record<string, unknown>): Promise<void>;
  upsertDailyReport(input: {
    report_date: string;
    campaign_id: string | null;
    status: "preparando" | "disponivel";
    metrics?: Record<string, unknown>;
    summary?: string;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Fase 3 — acesso a dados dos agentes de conversa
// ---------------------------------------------------------------------------
export interface AgentConversation {
  id: string;
  phone_e164: string;
  wa_id: string | null;
  contact_name: string | null;
  status: string;
  handled_by: "agente" | "humano";
  agent_paused: boolean;
  agent_role: "sdr" | "closer";
  customer_summary: string | null;
  company_id: string | null;
  lead_id: string | null;
}

export interface AgentContext {
  conversation: AgentConversation;
  messages: ChatMessage[];
  company: { name: string; category_label: string | null; website_status: string } | null;
  lead: { stage: string } | null;
  knowledge: KnowledgeEntry[];
}

export interface AgentDecisionInput {
  conversationId: string;
  intent: string;
  nextStage: string;
  handoff: boolean;
  handoffReason: string;
  agentRole: "sdr" | "closer";
  summary: string;
  opportunity: boolean;
  amountCents: number | null;
}

export interface AgentRepo {
  getAgentContext(conversationId: string): Promise<AgentContext | null>;
  sendCheck(conversationId: string, sender: "humano" | "agente", kind: "free_text" | "template"): Promise<{ allowed: boolean; reasons: string[] }>;
  sumAiTokens(usageDate: string): Promise<number>;
  countAgentReplies(conversationId: string, sinceIso: string): Promise<number>;
  registerOutbound(conversationId: string, body: string, sender: "humano" | "agente", idempotencyKey: string): Promise<{ message_id: string; duplicate: boolean; status: string }>;
  completeOutbound(messageId: string, wamid: string | null, error: string | null, metadata?: Record<string, unknown>): Promise<void>;
  applyAgentDecision(d: AgentDecisionInput): Promise<void>;
  agentOptOut(conversationId: string, reason: string): Promise<void>;
  busyMeetingRanges(fromIso: string, toIso: string): Promise<Array<{ starts_at: string; ends_at: string; status: string }>>;
  requestMeeting(conversationId: string, startsAtIso: string, reason: string): Promise<string>;
}
