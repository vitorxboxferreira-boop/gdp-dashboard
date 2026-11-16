// Repo em memória para testes do pipeline (simula as regras do banco relevantes).
import type { SearchArea } from "@core/places.ts";
import type {
  AgentSettings, Campaign, CompanyForScoring, CompanyInsert, Job, JobInsert, JobKind, JobStatus, Repo,
  UsageEventInput, UsageProvider,
} from "@core/repo.ts";
import type { ScoreResult } from "@core/scoring.ts";

type StoredJob = Job & { run_after: string; idempotency_key: string; result?: unknown; last_error: string | null };

export class MemoryRepo implements Repo {
  settings: AgentSettings = {
    automation_paused: false,
    autopilot_enabled: true,
    timezone: "America/Sao_Paulo",
    run_on_weekends: false,
    run_on_holidays: false,
    daily_company_limit: 50,
    places_daily_request_limit: 15,
    places_enabled: true,
    places_cost_per_request_usd: 0.035,
    places_content_ttl_days: 30,
    category_weights: { beauty_salon: 15, _default: 8 },
    scoring_thresholds: { alta: 70, media: 45 },
  };
  holidays: string[] = ["2026-11-20"];
  areas: SearchArea[] = [];
  usage: UsageEventInput[] = [];
  companies: Array<CompanyInsert & { id: string; discovered_at: string; updated_at: number }> = [];
  leads = new Map<string, ScoreResult & { scored_at: number; stage: string }>();
  campaigns: Array<Campaign & { kind: string; error?: string | null }> = [];
  jobs: StoredJob[] = [];
  reports = new Map<string, Record<string, unknown>>();
  private seq = 0;
  private id(prefix: string) {
    return `${prefix}-${++this.seq}`;
  }

  async getSettings() { return { ...this.settings }; }
  async getHolidays() { return this.holidays; }
  async listActiveAreas() { return this.areas.map((a) => ({ ...a })); }
  async updateAreaCursor(areaId: string, cursor: number) {
    const a = this.areas.find((x) => x.id === areaId);
    if (a) a.category_cursor = cursor;
  }
  async countUsage(provider: UsageProvider, date: string) {
    return this.usage.filter((u) => u.provider === provider && u.usage_date === date).length;
  }
  async recordUsage(e: UsageEventInput) { this.usage.push(e); }
  async countCompaniesDiscoveredSince(since: string) {
    return this.companies.filter((c) => c.discovered_at >= since).length;
  }
  async findCompanyByPlaceId(placeId: string) {
    const c = this.companies.find((x) => x.place_id === placeId);
    return c ? { id: c.id, website_status: c.website_status } : null;
  }
  async findCompanyByPhone(phone: string) {
    const c = this.companies.find((x) => x.phone_e164 === phone);
    return c ? { id: c.id } : null;
  }
  async refreshCompanyFromPlaces(id: string, patch: Partial<CompanyInsert>) {
    const c = this.companies.find((x) => x.id === id)!;
    Object.assign(c, patch, { updated_at: Date.now() + 1 });
  }
  async insertCompany(company: CompanyInsert) {
    if (this.companies.some((c) => c.place_id === company.place_id)) return null;
    const row = { ...company, id: this.id("co"), discovered_at: this.now().toISOString(), updated_at: Date.now() };
    this.companies.push(row);
    return { id: row.id };
  }
  async listCompaniesToScore(limit: number): Promise<CompanyForScoring[]> {
    return this.companies
      .filter((c) => {
        const l = this.leads.get(c.id);
        return !l || l.scored_at < c.updated_at;
      })
      .slice(0, limit)
      .map((c) => ({ ...c }));
  }
  async saveLeadScore(companyId: string, r: ScoreResult) {
    const prev = this.leads.get(companyId);
    this.leads.set(companyId, { ...r, scored_at: Date.now() + 10, stage: prev?.stage ?? "novo" });
  }
  async classifyLeads() {
    let qualified = 0;
    for (const l of this.leads.values()) {
      if (l.stage === "novo" && (l.priority === "alta" || l.priority === "media")) { l.stage = "qualificado"; qualified++; }
    }
    return { qualified, discarded: 0 };
  }
  async refreshEligibility() { return { nao_contatavel: this.leads.size }; }
  async findCronCampaign(date: string) {
    return this.campaigns.find((c) => c.campaign_date === date && c.trigger === "cron") ?? null;
  }
  async createCampaign(input: { campaign_date: string; trigger: "cron" | "manual"; created_by?: string | null }) {
    if (input.trigger === "cron" && (await this.findCronCampaign(input.campaign_date))) return null;
    const c = { id: this.id("camp"), campaign_date: input.campaign_date, trigger: input.trigger, status: "agendada" as const, stats: {}, kind: "daily_prospecting" };
    this.campaigns.push(c);
    return c;
  }
  async updateCampaign(id: string, patch: Record<string, unknown>) {
    Object.assign(this.campaigns.find((c) => c.id === id)!, patch);
  }
  async getCampaign(id: string) { return this.campaigns.find((c) => c.id === id) ?? null; }
  now = () => new Date();
  async enqueueJobs(jobs: JobInsert[]) {
    for (const j of jobs) {
      if (this.jobs.some((x) => x.idempotency_key === j.idempotency_key)) continue;
      this.jobs.push({
        id: this.id("job"), kind: j.kind, payload: j.payload ?? {}, campaign_id: j.campaign_id, status: "queued",
        attempts: 0, max_attempts: j.max_attempts ?? 5, run_after: j.run_after, idempotency_key: j.idempotency_key, last_error: null,
      });
    }
  }
  async claimJobs(_worker: string, limit: number, kinds?: JobKind[]) {
    const ready = this.jobs
      .filter((j) => j.status === "queued" && j.run_after <= this.now().toISOString() && (!kinds || kinds.includes(j.kind)))
      .sort((a, b) => a.run_after.localeCompare(b.run_after))
      .slice(0, limit);
    for (const j of ready) { j.status = "running"; j.attempts++; }
    return ready.map((j) => ({ ...j }));
  }
  async completeJob(id: string, result: Record<string, unknown>) {
    const j = this.jobs.find((x) => x.id === id)!; j.status = "done"; j.result = result;
  }
  async failJob(id: string, error: string, retry: boolean) {
    const j = this.jobs.find((x) => x.id === id)!;
    j.last_error = error;
    j.status = !retry || j.attempts >= j.max_attempts ? "dead" : "queued";
    if (j.status === "queued") j.run_after = new Date(this.now().getTime() + 30_000).toISOString();
    return j.status;
  }
  async deferJob(id: string, seconds: number, note: string) {
    const j = this.jobs.find((x) => x.id === id)!;
    j.status = "queued"; j.attempts = Math.max(0, j.attempts - 1); j.last_error = note;
    j.run_after = new Date(this.now().getTime() + seconds * 1000).toISOString();
  }
  async getJobStatus(campaignId: string, kind: JobKind) {
    return (this.jobs.find((j) => j.campaign_id === campaignId && j.kind === kind)?.status ?? null) as JobStatus | null;
  }
  async listCampaignJobs(campaignId: string) {
    return this.jobs.filter((j) => j.campaign_id === campaignId).map((j) => ({ kind: j.kind, status: j.status, result: j.result, last_error: j.last_error }));
  }
  async dashboardMetrics() { return { companies_today: this.companies.length, qualified_leads: 0 }; }
  limitAlerts: string[] = [];
  heartbeats: Array<{ component: string; ok: boolean }> = [];
  async notifyLimitOnce(key: string) { if (!this.limitAlerts.includes(key)) this.limitAlerts.push(key); }
  async recordHeartbeat(component: "agent_runner" | "whatsapp_webhook" | "panel_agents", ok: boolean) { this.heartbeats.push({ component, ok }); }
  async reportMetrics(from: string, to: string) { return { from, to, companies_found: this.companies.length, revenue_cents: 0 }; }
  async upsertDailyReport(input: { report_date: string; status: string; metrics?: Record<string, unknown>; summary?: string }) {
    this.reports.set(input.report_date, { ...(this.reports.get(input.report_date) ?? {}), ...input });
  }
}
