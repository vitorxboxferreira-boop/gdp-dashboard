// Orquestração dos agentes SCOUT e ANALYST + campanha diária.
// Independente de runtime: recebe um Repo, fetch e o relógio por injeção.

import { DeferError, PausedError, PermanentError, RetryableError } from "./errors.ts";
import type { AgentLlm } from "./anthropic-llm.ts";
import { runSdrReply } from "./sdr-runner.ts";
import type { SendConfig } from "./whatsapp.ts";
import { buildTextQuery, mapPlaceToCompany, PlacesApiError, searchTextPage, type FetchLike } from "./places.ts";
import type { AgentRepo, Job, JobInsert, JobKind, Repo } from "./repo.ts";
import {
  DAILY_PLAN,
  isOperatingDay,
  STEP_DEPENDENCY,
  withinStartWindow,
  zonedParts,
  zonedTimeToUtc,
  type PipelineStep,
} from "./schedule.ts";
import { scoreCompany, scoringConfigFromSettings } from "./scoring.ts";

export interface PipelineDeps {
  repo: Repo;
  llm?: AgentLlm | null;
  whatsapp?: SendConfig | null;
  fetchImpl?: FetchLike;
  placesApiKey?: string | null;
  now?: () => Date;
  log?: (msg: string, data?: Record<string, unknown>) => void;
}

const nowOf = (deps: PipelineDeps) => (deps.now ? deps.now() : new Date());
const log = (deps: PipelineDeps, msg: string, data?: Record<string, unknown>) => deps.log?.(msg, data);

async function assertNotPaused(repo: Repo) {
  const s = await repo.getSettings();
  if (s.automation_paused) throw new PausedError();
  return s;
}

// -----------------------------------------------------------------------------
// AGENTE SCOUT
// -----------------------------------------------------------------------------
export interface ScoutStats {
  skipped?: "places_disabled" | "missing_api_key" | "request_limit_reached" | "company_limit_reached" | "no_active_areas";
  requests: number;
  places_seen: number;
  new_companies: number;
  duplicates: number;
  invalid: number;
  queries: string[];
  request_budget_left: number;
  company_budget_left: number;
}

export async function runScout(
  deps: PipelineDeps,
  ctx: { campaignId: string | null; jobId: string | null; maxPagesPerQuery?: number },
): Promise<ScoutStats> {
  const { repo } = deps;
  const settings = await assertNotPaused(repo);
  const now = nowOf(deps);
  const today = zonedParts(now, settings.timezone);
  const startOfDay = zonedTimeToUtc(today.date, "00:00", settings.timezone).toISOString();

  const stats: ScoutStats = {
    requests: 0,
    places_seen: 0,
    new_companies: 0,
    duplicates: 0,
    invalid: 0,
    queries: [],
    request_budget_left: 0,
    company_budget_left: 0,
  };

  if (!settings.places_enabled) return { ...stats, skipped: "places_disabled" };
  if (!deps.placesApiKey) return { ...stats, skipped: "missing_api_key" };

  let requestBudget = settings.places_daily_request_limit - (await repo.countUsage("google_places", today.date));
  let companyBudget = settings.daily_company_limit - (await repo.countCompaniesDiscoveredSince(startOfDay));
  stats.request_budget_left = Math.max(0, requestBudget);
  stats.company_budget_left = Math.max(0, companyBudget);
  if (requestBudget <= 0) {
    await repo.notifyLimitOnce("places_requests", "Limite diário do Google Places atingido", `${settings.places_daily_request_limit} requisições hoje. Ajuste em Configurações se necessário.`);
    return { ...stats, skipped: "request_limit_reached" };
  }
  if (companyBudget <= 0) return { ...stats, skipped: "company_limit_reached" };

  const areas = (await repo.listActiveAreas()).filter((a) => a.categories.length > 0);
  if (areas.length === 0) return { ...stats, skipped: "no_active_areas" };

  const ttlMs = settings.places_content_ttl_days * 86_400_000;
  const maxPages = ctx.maxPagesPerQuery ?? 3;

  outer: for (const area of areas) {
    const total = area.categories.length;
    let cursor = area.category_cursor % total;
    for (let tried = 0; tried < total; tried++) {
      if (requestBudget <= 0 || companyBudget <= 0) break;
      const category = area.categories[cursor];
      cursor = (cursor + 1) % total;
      const textQuery = buildTextQuery(category, area);
      stats.queries.push(textQuery);

      let pageToken: string | undefined;
      let pages = 0;
      do {
        if (requestBudget <= 0 || companyBudget <= 0) break;
        // Parada de emergência é respeitada entre requisições.
        if ((await repo.getSettings()).automation_paused) {
          await repo.updateAreaCursor(area.id, cursor);
          throw new PausedError();
        }

        let response;
        try {
          response = await searchTextPage({
            apiKey: deps.placesApiKey,
            textQuery,
            area,
            pageToken,
            fetchImpl: deps.fetchImpl,
          });
        } catch (err) {
          const status = err instanceof PlacesApiError ? err.status : 0;
          await repo.recordUsage({
            provider: "google_places",
            operation: "places.searchText",
            units: 1,
            // Requisições com erro podem ou não ser cobradas; registramos custo 0 e a falha.
            estimated_cost_usd: 0,
            success: false,
            usage_date: today.date,
            campaign_id: ctx.campaignId,
            job_id: ctx.jobId,
            metadata: { textQuery, status, error: (err as Error).message },
          });
          await repo.updateAreaCursor(area.id, (cursor - 1 + total) % total);
          if (err instanceof PlacesApiError && !err.retryable) throw new PermanentError(err.message);
          throw new RetryableError((err as Error).message);
        }

        requestBudget--;
        stats.requests++;
        pages++;
        await repo.recordUsage({
          provider: "google_places",
          operation: "places.searchText",
          units: 1,
          estimated_cost_usd: Number(settings.places_cost_per_request_usd),
          success: true,
          usage_date: today.date,
          campaign_id: ctx.campaignId,
          job_id: ctx.jobId,
          metadata: { textQuery, page: pages, results: response.places?.length ?? 0 },
        });

        for (const place of response.places ?? []) {
          stats.places_seen++;
          const draft = mapPlaceToCompany(place, area);
          if (!draft) {
            stats.invalid++;
            continue;
          }
          const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

          const existing = await repo.findCompanyByPlaceId(draft.place_id);
          if (existing) {
            stats.duplicates++;
            const keepVerified =
              existing.website_status === "verified_none" || existing.website_status === "verified_exists";
            const { place_id: _pid, source: _src, website_status, ...rest } = draft;
            await repo.refreshCompanyFromPlaces(existing.id, {
              ...rest,
              ...(keepVerified ? {} : { website_status }),
              places_data_expires_at: expiresAt,
            });
            continue;
          }
          if (draft.phone_e164 && (await repo.findCompanyByPhone(draft.phone_e164))) {
            stats.duplicates++;
            continue;
          }
          if (companyBudget <= 0) break;
          const inserted = await repo.insertCompany({
            ...draft,
            search_area_id: area.id,
            campaign_id: ctx.campaignId,
            places_data_expires_at: expiresAt,
          });
          if (inserted) {
            stats.new_companies++;
            companyBudget--;
          } else {
            stats.duplicates++;
          }
        }
        pageToken = response.nextPageToken;
      } while (pageToken && pages < maxPages && companyBudget > 0);
    }
    await repo.updateAreaCursor(area.id, cursor);
    if (requestBudget <= 0 || companyBudget <= 0) break outer;
  }

  stats.request_budget_left = Math.max(0, requestBudget);
  stats.company_budget_left = Math.max(0, companyBudget);
  log(deps, "scout.done", stats as unknown as Record<string, unknown>);
  return stats;
}

// -----------------------------------------------------------------------------
// AGENTE ANALYST
// -----------------------------------------------------------------------------
export async function runAnalyst(deps: PipelineDeps, opts: { maxCompanies?: number } = {}) {
  const { repo } = deps;
  const settings = await assertNotPaused(repo);
  const config = scoringConfigFromSettings(settings);
  const max = opts.maxCompanies ?? 1000;
  const byPriority: Record<string, number> = {};
  let scored = 0;
  while (scored < max) {
    const batch = await repo.listCompaniesToScore(Math.min(100, max - scored));
    if (batch.length === 0) break;
    for (const company of batch) {
      const result = scoreCompany(company, config);
      await repo.saveLeadScore(company.id, result);
      byPriority[result.priority] = (byPriority[result.priority] ?? 0) + 1;
      scored++;
    }
  }
  return { scored, by_priority: byPriority };
}

// -----------------------------------------------------------------------------
// Relatório diário
// -----------------------------------------------------------------------------
export async function prepareReport(deps: PipelineDeps, campaignId: string | null, reportDate: string) {
  const { repo } = deps;
  const m = await repo.reportMetrics(reportDate, reportDate);
  const jobs = campaignId ? await repo.listCampaignJobs(campaignId) : [];
  const scout = jobs.find((j) => j.kind === "scout.search");
  const failures = jobs.filter((j) => j.status === "dead" || j.status === "cancelled");
  const scoutResult = (scout?.result ?? {}) as Partial<ScoutStats>;
  const n = (k: string) => Number(m[k] ?? 0);
  const usd = (k: string) => `US$ ${n(k).toFixed(2)}`;
  const brl = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

  const lines = [
    "Prospecção",
    `• Empresas novas: ${n("companies_found")} (sem site próprio identificado: ${n("companies_without_site")})`,
    `• Leads qualificados (alta/média): ${n("leads_qualified")} · novas autorizações de contato: ${n("authorized_contacts_new")}`,
    "Conversas",
    `• Novas conversas: ${n("conversations_new")} · mensagens recebidas: ${n("messages_received")}`,
    `• Respostas do agente: ${n("agent_replies")} · mensagens da equipe: ${n("team_messages")} · templates: ${n("templates_sent")}`,
    `• Transferências para humano: ${n("handoffs")} · descadastros: ${n("opt_outs")}`,
    "Resultados",
    `• Oportunidades: ${n("opportunities")} · vendas aprovadas: ${n("sales_approved")} · pagas: ${n("sales_paid")} (${brl(n("revenue_cents"))})`,
    `• Reuniões pedidas: ${n("meetings_requested")} · confirmadas: ${n("meetings_confirmed")}`,
    "Custos estimados",
    `• Google Places ${usd("cost_places_usd")} · IA ${usd("cost_ai_usd")} (${n("ai_tokens").toLocaleString("pt-BR")} tokens) · WhatsApp ${usd("cost_whatsapp_usd")}`,
  ];
  if (scoutResult.skipped) lines.push(`Pesquisa não executada: ${SKIP_LABELS[scoutResult.skipped] ?? scoutResult.skipped}`);
  if (failures.length) lines.push(`Etapas com falha: ${failures.map((f) => `${f.kind} (${f.last_error ?? f.status})`).join("; ")}`);

  await repo.upsertDailyReport({
    report_date: reportDate,
    campaign_id: campaignId,
    status: "preparando",
    metrics: { ...m, scout: scoutResult, jobs: jobs.map((j) => ({ kind: j.kind, status: j.status })) },
    summary: lines.join("\n"),
  });
  return { lines: lines.length };
}

export const SKIP_LABELS: Record<string, string> = {
  places_disabled: "integração Google Places desativada no painel",
  missing_api_key: "chave GOOGLE_PLACES_API_KEY não configurada",
  request_limit_reached: "limite diário de requisições ao Google Places atingido",
  company_limit_reached: "limite diário de empresas atingido",
  no_active_areas: "nenhuma área de busca ativa com categorias",
};

// -----------------------------------------------------------------------------
// Campanhas e fila
// -----------------------------------------------------------------------------
const MANUAL_STEPS: PipelineStep[] = ["campaign.start", "scout.search", "analyst.score", "leads.classify", "eligibility.check"];

export async function startManualCampaign(deps: PipelineDeps, createdBy: string | null) {
  const { repo } = deps;
  const settings = await assertNotPaused(repo);
  const now = nowOf(deps);
  const date = zonedParts(now, settings.timezone).date;
  const campaign = await repo.createCampaign({ campaign_date: date, trigger: "manual", created_by: createdBy });
  if (!campaign) throw new PermanentError("Não foi possível criar a campanha manual");
  await repo.enqueueJobs(
    MANUAL_STEPS.map((step) => ({
      kind: step,
      campaign_id: campaign.id,
      run_after: now.toISOString(),
      idempotency_key: `${campaign.id}:${step}`,
      max_attempts: 3,
    })),
  );
  return campaign;
}

export interface TickResult {
  paused?: boolean;
  campaign?: { id: string; created: boolean } | null;
  dayStatus?: string;
  processed: Array<{ id: string; kind: JobKind; outcome: string; detail?: string }>;
}

/** Executado periodicamente (Supabase Cron → Edge Function). */
export async function orchestratorTick(
  deps: PipelineDeps,
  opts: { worker: string; maxJobs?: number; timeBudgetMs?: number },
): Promise<TickResult> {
  const { repo } = deps;
  const settings = await repo.getSettings();
  const result: TickResult = { processed: [] };
  if (settings.automation_paused) return { ...result, paused: true };

  const now = nowOf(deps);
  const parts = zonedParts(now, settings.timezone);

  if (settings.autopilot_enabled) {
    const day = isOperatingDay(parts, {
      holidays: await repo.getHolidays(),
      runOnWeekends: settings.run_on_weekends,
      runOnHolidays: settings.run_on_holidays,
    });
    result.dayStatus = day.ok ? "dia útil" : day.reason;
    if (day.ok && withinStartWindow(parts)) {
      let campaign = await repo.findCronCampaign(parts.date);
      let created = false;
      if (!campaign) {
        campaign = await repo.createCampaign({ campaign_date: parts.date, trigger: "cron" });
        created = campaign != null;
        campaign = campaign ?? (await repo.findCronCampaign(parts.date));
      }
      if (campaign && created) {
        const jobs: JobInsert[] = DAILY_PLAN.map((p) => ({
          kind: p.step,
          campaign_id: campaign!.id,
          run_after: zonedTimeToUtc(parts.date, p.time, settings.timezone).toISOString(),
          idempotency_key: `${parts.date}:cron:${p.step}`,
        }));
        await repo.enqueueJobs(jobs);
      }
      result.campaign = campaign ? { id: campaign.id, created } : null;
    }
  } else {
    result.dayStatus = "piloto automático desativado";
  }

  const processed = await processJobs(deps, opts);
  return { ...result, processed };
}

export async function processJobs(
  deps: PipelineDeps,
  opts: { worker: string; maxJobs?: number; timeBudgetMs?: number; kinds?: JobKind[] },
): Promise<TickResult["processed"]> {
  const { repo } = deps;
  const out: TickResult["processed"] = [];
  const started = Date.now();
  const maxJobs = opts.maxJobs ?? 20;
  const budget = opts.timeBudgetMs ?? 100_000;

  while (out.length < maxJobs && Date.now() - started < budget) {
    const jobs = await repo.claimJobs(opts.worker, 1, opts.kinds);
    if (jobs.length === 0) break;
    const job = jobs[0];
    out.push(await runJob(deps, job));
  }
  return out;
}

const REPORT_STEPS = new Set<JobKind>(["report.prepare", "report.publish"]);

export async function runJob(deps: PipelineDeps, job: Job): Promise<TickResult["processed"][number]> {
  const { repo } = deps;
  try {
    // Dependências entre etapas da campanha
    const dep = STEP_DEPENDENCY[job.kind as PipelineStep];
    if (dep && job.campaign_id) {
      const depStatus = await repo.getJobStatus(job.campaign_id, dep);
      if (depStatus === "queued" || depStatus === "running") {
        await repo.deferJob(job.id, 120, `Aguardando etapa ${dep}`);
        return { id: job.id, kind: job.kind, outcome: "deferred", detail: dep };
      }
      if ((depStatus === "dead" || depStatus === "cancelled" || depStatus === "failed") && !REPORT_STEPS.has(job.kind)) {
        throw new PermanentError(`Etapa anterior ${dep} não concluída (${depStatus})`);
      }
    }

    const res = await executeStep(deps, job);
    await repo.completeJob(job.id, res);
    return { id: job.id, kind: job.kind, outcome: "done" };
  } catch (err) {
    if (err instanceof DeferError) {
      await repo.deferJob(job.id, err.seconds, err.message);
      return { id: job.id, kind: job.kind, outcome: "deferred", detail: err.message };
    }
    const retry = !(err instanceof PermanentError);
    const status = await repo.failJob(job.id, (err as Error).message, retry);
    if (status === "dead" && job.kind === "sdr.reply" && job.payload?.conversation_id) {
      // Sem resposta automática possível: a equipe humana assume a conversa.
      await (repo as Repo & AgentRepo).applyAgentDecision({
        conversationId: String(job.payload.conversation_id), intent: "outro", nextStage: "sem_mudanca", handoff: true,
        handoffReason: `Agente não conseguiu responder: ${(err as Error).message}`.slice(0, 400),
        agentRole: "sdr", summary: "", opportunity: false, amountCents: null,
      }).catch(() => undefined);
    }
    if (status === "dead" && job.campaign_id && !(err instanceof PausedError)) {
      await repo.updateCampaign(job.campaign_id, { status: "falhou", error: `${job.kind}: ${(err as Error).message}` });
    }
    log(deps, "job.failed", { kind: job.kind, error: (err as Error).message, status });
    return { id: job.id, kind: job.kind, outcome: status, detail: (err as Error).message };
  }
}

async function executeStep(deps: PipelineDeps, job: Job): Promise<Record<string, unknown>> {
  const { repo } = deps;
  const now = nowOf(deps);
  switch (job.kind) {
    case "campaign.start": {
      await assertNotPaused(repo);
      if (job.campaign_id) {
        await repo.updateCampaign(job.campaign_id, { status: "em_execucao", started_at: now.toISOString() });
      }
      return { started: true };
    }
    case "scout.search": {
      const stats = await runScout(deps, { campaignId: job.campaign_id, jobId: job.id });
      if (job.campaign_id) await mergeCampaignStats(repo, job.campaign_id, { scout: stats });
      return stats as unknown as Record<string, unknown>;
    }
    case "analyst.score": {
      const res = await runAnalyst(deps);
      if (job.campaign_id) await mergeCampaignStats(repo, job.campaign_id, { analyst: res });
      return res;
    }
    case "leads.classify": {
      await assertNotPaused(repo);
      const res = await repo.classifyLeads();
      if (job.campaign_id) await mergeCampaignStats(repo, job.campaign_id, { classify: res });
      return res;
    }
    case "eligibility.check": {
      await assertNotPaused(repo);
      const res = await repo.refreshEligibility();
      if (job.campaign_id) {
        await mergeCampaignStats(repo, job.campaign_id, { eligibility: res });
        const campaign = await repo.getCampaign(job.campaign_id);
        if (campaign?.trigger === "manual") {
          await repo.updateCampaign(job.campaign_id, { status: "concluida", finished_at: now.toISOString() });
        }
      }
      return res;
    }
    case "report.prepare": {
      const settings = await repo.getSettings();
      const date = zonedParts(now, settings.timezone).date;
      return prepareReport(deps, job.campaign_id, date);
    }
    case "report.publish": {
      const settings = await repo.getSettings();
      const date = zonedParts(now, settings.timezone).date;
      await repo.upsertDailyReport({ report_date: date, campaign_id: job.campaign_id, status: "disponivel" });
      if (job.campaign_id) {
        const campaign = await repo.getCampaign(job.campaign_id);
        if (campaign && campaign.status !== "falhou") {
          await repo.updateCampaign(job.campaign_id, { status: "concluida", finished_at: now.toISOString() });
        }
      }
      return { published: true };
    }
    case "sdr.reply": {
      const res = await runSdrReply({ repo: repo as Repo & AgentRepo, llm: deps.llm, whatsapp: deps.whatsapp, now: deps.now }, job);
      return res as unknown as Record<string, unknown>;
    }
    default:
      throw new PermanentError(`Tipo de tarefa não suportado: ${job.kind}`);
  }
}

async function mergeCampaignStats(repo: Repo, campaignId: string, patch: Record<string, unknown>) {
  const c = await repo.getCampaign(campaignId);
  await repo.updateCampaign(campaignId, { stats: { ...(c?.stats ?? {}), ...patch } });
}
