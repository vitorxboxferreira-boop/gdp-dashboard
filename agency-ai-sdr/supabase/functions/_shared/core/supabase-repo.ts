// Implementação do Repo sobre supabase-js. Deve ser instanciada SOMENTE no
// servidor/Edge Function com a chave service_role (nunca no navegador).

import type { SearchArea } from "./places.ts";
import type {
  AgentSettings,
  Campaign,
  CompanyForScoring,
  CompanyInsert,
  Job,
  JobInsert,
  JobKind,
  JobStatus,
  Repo,
  UsageEventInput,
  UsageProvider,
} from "./repo.ts";
import type { ScoreResult } from "./scoring.ts";
import type { WebsiteStatus } from "./website.ts";

// Tipagem estrutural mínima: funciona com o cliente de Node e de Deno.
// deno-lint-ignore no-explicit-any
type Any = any;
export interface SupabaseLike {
  from(table: string): Any;
  rpc(fn: string, args?: Record<string, unknown>): Any;
}

interface PgError {
  code?: string;
  message: string;
}

function check<T>(res: { data: T; error: PgError | null }, ctx: string): T {
  if (res.error) throw new Error(`${ctx}: ${res.error.message}`);
  return res.data;
}

export class SupabaseRepo implements Repo {
  constructor(private readonly db: SupabaseLike) {}

  async getSettings(): Promise<AgentSettings> {
    const data = check(await this.db.from("agent_settings").select("*").eq("id", 1).single(), "agent_settings") as Record<string, unknown>;
    return {
      ...data,
      places_cost_per_request_usd: Number(data.places_cost_per_request_usd),
    } as AgentSettings;
  }

  async getHolidays(): Promise<string[]> {
    const data = check(await this.db.from("holidays").select("holiday_date"), "holidays") as Array<{ holiday_date: string }>;
    return data.map((h) => h.holiday_date);
  }

  async listActiveAreas(): Promise<SearchArea[]> {
    return check(
      await this.db
        .from("search_areas")
        .select("id, city, state, country, latitude, longitude, radius_m, categories, category_cursor")
        .eq("active", true)
        .order("priority", { ascending: true }),
      "search_areas",
    ) as SearchArea[];
  }

  async updateAreaCursor(areaId: string, cursor: number) {
    check(await this.db.from("search_areas").update({ category_cursor: cursor }).eq("id", areaId), "update cursor");
  }

  async countUsage(provider: UsageProvider, usageDate: string) {
    const res = await this.db
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("provider", provider)
      .eq("usage_date", usageDate);
    if (res.error) throw new Error(`usage count: ${res.error.message}`);
    return res.count ?? 0;
  }

  async recordUsage(event: UsageEventInput) {
    check(await this.db.from("usage_events").insert(event), "usage insert");
  }

  async countCompaniesDiscoveredSince(sinceIso: string) {
    const res = await this.db
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("is_demo", false)
      .gte("discovered_at", sinceIso);
    if (res.error) throw new Error(`companies count: ${res.error.message}`);
    return res.count ?? 0;
  }

  async findCompanyByPlaceId(placeId: string) {
    return check(
      await this.db.from("companies").select("id, website_status").eq("place_id", placeId).maybeSingle(),
      "find by place_id",
    ) as { id: string; website_status: WebsiteStatus } | null;
  }

  async findCompanyByPhone(phoneE164: string) {
    const data = check(
      await this.db.from("companies").select("id").eq("phone_e164", phoneE164).limit(1),
      "find by phone",
    ) as Array<{ id: string }>;
    return data[0] ?? null;
  }

  async refreshCompanyFromPlaces(id: string, patch: Partial<CompanyInsert>) {
    const { search_area_id: _a, campaign_id: _c, ...rest } = patch;
    const res = await this.db.from("companies").update({ ...rest, last_seen_at: new Date().toISOString() }).eq("id", id);
    // Conflito com outra empresa já cadastrada (nome/cidade/telefone): mantém os dados atuais.
    if (res.error && (res.error as PgError).code !== "23505") throw new Error(`refresh company: ${res.error.message}`);
  }

  async insertCompany(company: CompanyInsert) {
    const res = await this.db.from("companies").insert(company).select("id").single();
    if (res.error) {
      if ((res.error as PgError).code === "23505") return null; // unique_violation → duplicata
      throw new Error(`insert company: ${res.error.message}`);
    }
    return res.data as { id: string };
  }

  async listCompaniesToScore(limit: number): Promise<CompanyForScoring[]> {
    const data = check(await this.db.rpc("companies_pending_scoring", { p_limit: limit }), "pending scoring") as Array<
      CompanyForScoring & { rating: string | number | null }
    >;
    return data.map((c) => ({ ...c, rating: c.rating == null ? null : Number(c.rating) }));
  }

  async saveLeadScore(companyId: string, r: ScoreResult) {
    check(
      await this.db.from("leads").upsert(
        {
          company_id: companyId,
          score: r.score,
          priority: r.priority,
          score_reasons: { reasons: r.reasons, needs_verification: r.needsVerification },
          score_version: r.version,
          scored_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      ),
      "save lead score",
    );
  }

  async classifyLeads() {
    return check(await this.db.rpc("classify_leads"), "classify_leads") as Record<string, number>;
  }

  async refreshEligibility() {
    return check(await this.db.rpc("refresh_all_lead_eligibility"), "eligibility") as Record<string, number>;
  }

  async findCronCampaign(date: string) {
    return check(
      await this.db
        .from("campaigns")
        .select("id, campaign_date, trigger, status, stats")
        .eq("campaign_date", date)
        .eq("trigger", "cron")
        .eq("kind", "daily_prospecting")
        .maybeSingle(),
      "find campaign",
    ) as Campaign | null;
  }

  async createCampaign(input: { campaign_date: string; trigger: "cron" | "manual"; created_by?: string | null }) {
    const res = await this.db
      .from("campaigns")
      .insert({ ...input, kind: "daily_prospecting" })
      .select("id, campaign_date, trigger, status, stats")
      .single();
    if (res.error) {
      if ((res.error as PgError).code === "23505") return null;
      throw new Error(`create campaign: ${res.error.message}`);
    }
    return res.data as Campaign;
  }

  async updateCampaign(id: string, patch: Record<string, unknown>) {
    check(await this.db.from("campaigns").update(patch).eq("id", id), "update campaign");
  }

  async getCampaign(id: string) {
    return check(
      await this.db.from("campaigns").select("id, campaign_date, trigger, status, stats").eq("id", id).maybeSingle(),
      "get campaign",
    ) as Campaign | null;
  }

  async enqueueJobs(jobs: JobInsert[]) {
    if (!jobs.length) return;
    check(
      await this.db.from("jobs").upsert(jobs, { onConflict: "idempotency_key", ignoreDuplicates: true }),
      "enqueue jobs",
    );
  }

  async claimJobs(worker: string, limit: number) {
    return check(
      await this.db.rpc("claim_jobs", { p_worker: worker, p_limit: limit, p_lock_timeout_seconds: 600 }),
      "claim_jobs",
    ) as Job[];
  }

  async completeJob(id: string, result: Record<string, unknown>) {
    check(await this.db.rpc("complete_job", { p_job_id: id, p_result: result }), "complete_job");
  }

  async failJob(id: string, error: string, retry: boolean) {
    return check(await this.db.rpc("fail_job", { p_job_id: id, p_error: error, p_retry: retry }), "fail_job") as string;
  }

  async deferJob(id: string, seconds: number, note: string) {
    check(await this.db.rpc("defer_job", { p_job_id: id, p_seconds: seconds, p_note: note }), "defer_job");
  }

  async getJobStatus(campaignId: string, kind: JobKind) {
    const data = check(
      await this.db.from("jobs").select("status").eq("campaign_id", campaignId).eq("kind", kind).maybeSingle(),
      "job status",
    ) as { status: JobStatus } | null;
    return data?.status ?? null;
  }

  async listCampaignJobs(campaignId: string) {
    return check(
      await this.db.from("jobs").select("kind, status, result, last_error").eq("campaign_id", campaignId),
      "campaign jobs",
    ) as Array<{ kind: JobKind; status: JobStatus; result: unknown; last_error: string | null }>;
  }

  async dashboardMetrics() {
    return check(await this.db.rpc("dashboard_metrics"), "dashboard_metrics") as Record<string, unknown>;
  }

  async upsertDailyReport(input: {
    report_date: string;
    campaign_id: string | null;
    status: "preparando" | "disponivel";
    metrics?: Record<string, unknown>;
    summary?: string;
  }) {
    const now = new Date().toISOString();
    const row: Record<string, unknown> = { report_date: input.report_date, campaign_id: input.campaign_id, status: input.status };
    if (input.metrics) row.metrics = input.metrics;
    if (input.summary) row.summary = input.summary;
    if (input.status === "preparando") row.generated_at = now;
    if (input.status === "disponivel") row.published_at = now;
    check(await this.db.from("daily_reports").upsert(row, { onConflict: "report_date" }), "daily report");
  }
}
