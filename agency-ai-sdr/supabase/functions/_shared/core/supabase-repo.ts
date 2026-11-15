// Implementação do Repo sobre supabase-js. Deve ser instanciada SOMENTE no
// servidor/Edge Function com a chave service_role (nunca no navegador).

import type { SearchArea } from "./places.ts";
import type {
  AgentContext,
  AgentDecisionInput,
  AgentRepo,
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
import type { ChatMessage, KnowledgeEntry } from "./sdr-agent.ts";
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

export class SupabaseRepo implements Repo, AgentRepo {
  constructor(private readonly db: SupabaseLike) {}

  async getSettings(): Promise<AgentSettings> {
    const data = check(await this.db.from("agent_settings").select("*").eq("id", 1).single(), "agent_settings") as Record<string, unknown>;
    return {
      ...data,
      places_cost_per_request_usd: Number(data.places_cost_per_request_usd),
      ai_cost_per_mtok_input_usd: Number(data.ai_cost_per_mtok_input_usd),
      ai_cost_per_mtok_output_usd: Number(data.ai_cost_per_mtok_output_usd),
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

  async claimJobs(worker: string, limit: number, kinds?: JobKind[]) {
    return check(
      await this.db.rpc("claim_jobs", { p_worker: worker, p_limit: limit, p_lock_timeout_seconds: 600, p_kinds: kinds ?? null }),
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
    const row: Record<string, unknown> = { report_date: input.report_date, status: input.status };
    if (input.campaign_id) row.campaign_id = input.campaign_id;
    if (input.metrics) row.metrics = input.metrics;
    if (input.summary) row.summary = input.summary;
    if (input.status === "preparando") row.generated_at = now;
    if (input.status === "disponivel") row.published_at = now;
    check(await this.db.from("daily_reports").upsert(row, { onConflict: "report_date" }), "daily report");
  }

  // ---------------------------------------------------------------------------
  // Agentes de conversa (Fase 3)
  // ---------------------------------------------------------------------------
  async getAgentContext(conversationId: string): Promise<AgentContext | null> {
    const conv = check(
      await this.db
        .from("conversations")
        .select("id, phone_e164, wa_id, contact_name, status, handled_by, agent_paused, agent_role, customer_summary, company_id, lead_id")
        .eq("id", conversationId)
        .maybeSingle(),
      "agent conversation",
    ) as AgentContext["conversation"] | null;
    if (!conv) return null;
    const [msgs, company, lead, kb] = await Promise.all([
      this.db
        .from("messages")
        .select("direction, sender, body, message_type, wa_message_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(40),
      conv.company_id
        ? this.db.from("companies").select("name, category_label, website_status").eq("id", conv.company_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      conv.lead_id ? this.db.from("leads").select("stage").eq("id", conv.lead_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      this.db.from("knowledge_base").select("kind, title, content, url").eq("active", true).order("sort_order"),
    ]);
    return {
      conversation: conv,
      messages: (check(msgs, "agent messages") as ChatMessage[]).reverse(),
      company: check(company, "agent company") as AgentContext["company"],
      lead: check(lead, "agent lead") as AgentContext["lead"],
      knowledge: check(kb, "knowledge") as KnowledgeEntry[],
    };
  }

  async sendCheck(conversationId: string, sender: "humano" | "agente", kind: "free_text" | "template") {
    return check(
      await this.db.rpc("whatsapp_send_check", { p_conversation_id: conversationId, p_sender: sender, p_kind: kind }),
      "send check",
    ) as { allowed: boolean; reasons: string[] };
  }

  async sumAiTokens(usageDate: string) {
    const data = check(
      await this.db.from("usage_events").select("input_tokens, output_tokens").eq("provider", "anthropic").eq("usage_date", usageDate),
      "ai tokens",
    ) as Array<{ input_tokens: number; output_tokens: number }>;
    return data.reduce((a, r) => a + r.input_tokens + r.output_tokens, 0);
  }

  async countAgentReplies(conversationId: string, sinceIso: string) {
    const res = await this.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sender", "agente")
      .gte("created_at", sinceIso);
    if (res.error) throw new Error(`agent replies: ${res.error.message}`);
    return res.count ?? 0;
  }

  async registerOutbound(conversationId: string, body: string, sender: "humano" | "agente", idempotencyKey: string) {
    return check(
      await this.db.rpc("register_outbound_message", {
        p_conversation_id: conversationId, p_body: body, p_sender: sender, p_sent_by: null, p_idempotency_key: idempotencyKey,
      }),
      "register outbound",
    ) as { message_id: string; duplicate: boolean; status: string };
  }

  async completeOutbound(messageId: string, wamid: string | null, error: string | null, metadata?: Record<string, unknown>) {
    check(await this.db.rpc("complete_outbound_message", { p_message_id: messageId, p_wamid: wamid, p_error: error }), "complete outbound");
    if (metadata) check(await this.db.from("messages").update({ metadata }).eq("id", messageId), "message metadata");
  }

  async applyAgentDecision(d: AgentDecisionInput) {
    check(
      await this.db.rpc("apply_agent_decision", {
        p_conversation_id: d.conversationId, p_intent: d.intent, p_next_stage: d.nextStage, p_handoff: d.handoff,
        p_handoff_reason: d.handoffReason, p_agent_role: d.agentRole, p_summary: d.summary,
        p_opportunity: d.opportunity, p_amount_cents: d.amountCents,
      }),
      "apply decision",
    );
  }

  async agentOptOut(conversationId: string, reason: string) {
    check(await this.db.rpc("agent_opt_out", { p_conversation_id: conversationId, p_reason: reason }), "agent opt-out");
  }

  async busyMeetingRanges(fromIso: string, toIso: string) {
    return check(await this.db.rpc("busy_meeting_ranges", { p_from: fromIso, p_to: toIso }), "busy ranges") as Array<{ starts_at: string; ends_at: string; status: string }>;
  }

  async requestMeeting(conversationId: string, startsAtIso: string, reason: string) {
    return check(
      await this.db.rpc("request_meeting", { p_conversation_id: conversationId, p_starts_at: startsAtIso, p_reason: reason }),
      "request meeting",
    ) as string;
  }

  async reportMetrics(from: string, to: string) {
    return check(await this.db.rpc("report_metrics", { p_from: from, p_to: to }), "report metrics") as Record<string, unknown>;
  }
}
