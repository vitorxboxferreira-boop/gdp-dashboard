// Contrato de acesso a dados usado pelos agentes. Implementações:
//   * SupabaseRepo (produção, via supabase-js com service_role)
//   * MemoryRepo   (testes automatizados)

import type { CompanyDraft, SearchArea } from "./places.ts";
import type { ScoreResult, ScoringInput } from "./scoring.ts";
import type { PipelineStep } from "./schedule.ts";
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
}

export type UsageProvider = "google_places" | "anthropic" | "whatsapp";

export interface UsageEventInput {
  provider: UsageProvider;
  operation: string;
  units: number;
  estimated_cost_usd: number;
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

export type JobKind = PipelineStep | "maintenance.retention";
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
  claimJobs(worker: string, limit: number): Promise<Job[]>;
  completeJob(id: string, result: Record<string, unknown>): Promise<void>;
  failJob(id: string, error: string, retry: boolean): Promise<string>;
  deferJob(id: string, seconds: number, note: string): Promise<void>;
  getJobStatus(campaignId: string, kind: JobKind): Promise<JobStatus | null>;
  listCampaignJobs(campaignId: string): Promise<Array<{ kind: JobKind; status: JobStatus; result: unknown; last_error: string | null }>>;

  dashboardMetrics(): Promise<Record<string, unknown>>;
  upsertDailyReport(input: {
    report_date: string;
    campaign_id: string | null;
    status: "preparando" | "disponivel";
    metrics?: Record<string, unknown>;
    summary?: string;
  }): Promise<void>;
}
