// Executor da tarefa "sdr.reply": responde a mensagem recebida com o agente SDR/Closer.
// Ordem: dados → já respondida? → horário → verificação de envio (sem custo de IA)
//        → limites de IA → modelo → travas → envio → registro da decisão.

import { LlmError, type AgentLlm, type LlmResult } from "./anthropic-llm.ts";
import { DeferError, PermanentError, RetryableError } from "./errors.ts";
import type { AgentRepo, Job, Repo } from "./repo.ts";
import { zonedParts, zonedTimeToUtc } from "./schedule.ts";
import {
  allowedAmountsFrom,
  buildContextPrompt,
  buildStablePrompt,
  buildTurns,
  chooseRole,
  checkReply,
  estimateCostUsd,
  HANDOFF_MESSAGE,
  roleAfterDecision,
  withinAgentHours,
} from "./sdr-agent.ts";
import { sendTextMessage, WhatsAppApiError, type SendConfig } from "./whatsapp.ts";

export interface SdrDeps {
  repo: Repo & AgentRepo;
  llm?: AgentLlm | null;
  whatsapp?: SendConfig | null;
  now?: () => Date;
}

export type SdrOutcome =
  | { outcome: "skipped"; reason: string }
  | { outcome: "replied" | "handoff" | "opt_out"; intent?: string; violations?: string[]; role?: string };

const DEFAULT_OFFER = {
  product_name: "Site profissional", price_cents: 25000, currency: "BRL", includes: [], not_included: [],
  max_discount_percent: 0, payment_terms: "", delivery_time: "",
};

export async function runSdrReply(deps: SdrDeps, job: Pick<Job, "id" | "payload">): Promise<SdrOutcome> {
  const { repo } = deps;
  const now = deps.now ? deps.now() : new Date();
  const conversationId = String(job.payload.conversation_id ?? "");
  const wamid = String(job.payload.wamid ?? "");
  if (!conversationId || !wamid) throw new PermanentError("Tarefa sdr.reply sem conversa/mensagem");

  const ctx = await repo.getAgentContext(conversationId);
  if (!ctx) return { outcome: "skipped", reason: "conversa não encontrada" };
  const { conversation: conv, messages } = ctx;

  // Só a tarefa da mensagem mais recente responde (agrupa mensagens em sequência).
  const inbound = messages.filter((m) => m.direction === "inbound");
  const latestInbound = inbound[inbound.length - 1];
  if (!latestInbound || latestInbound.wa_message_id !== wamid) return { outcome: "skipped", reason: "substituída por mensagem mais recente" };
  if (messages[messages.length - 1]?.direction === "outbound") return { outcome: "skipped", reason: "já respondida" };

  const s = await repo.getSettings();
  const tz = s.timezone;
  const local = zonedParts(now, tz);
  if (!withinAgentHours(local, { days: s.agent_days ?? [1, 2, 3, 4, 5], start: (s.agent_hours_start ?? "08:00").slice(0, 5), end: (s.agent_hours_end ?? "18:00").slice(0, 5) })) {
    throw new DeferError(30 * 60, "Fora do horário de atendimento do agente");
  }

  // Verificação de envio ANTES de gastar com IA.
  const gate = await repo.sendCheck(conversationId, "agente", "free_text");
  if (!gate.allowed) return { outcome: "skipped", reason: gate.reasons.join("; ") };
  if (!deps.llm) throw new PermanentError("Modelo de IA não configurado (ANTHROPIC_API_KEY)");
  if (!deps.whatsapp) throw new PermanentError("Envio do WhatsApp não configurado");

  const send = async (text: string, metadata: Record<string, unknown>) => {
    const reg = await repo.registerOutbound(conversationId, text, "agente", `agent:${wamid}`);
    if (reg.duplicate && reg.status !== "pendente") return; // já enviada (ou falhou definitivamente)
    try {
      const { wamid: out } = await sendTextMessage(deps.whatsapp!, conv.wa_id ?? conv.phone_e164, text);
      await repo.completeOutbound(reg.message_id, out, null, metadata);
    } catch (err) {
      const retryable = err instanceof WhatsAppApiError ? err.retryable : true;
      if (retryable) throw new RetryableError((err as Error).message); // mensagem continua "pendente" e será reenviada
      await repo.completeOutbound(reg.message_id, null, (err as Error).message, metadata);
      throw new PermanentError(`Falha no envio: ${(err as Error).message}`);
    }
  };

  const handoff = async (reason: string, extra: Record<string, unknown> = {}) => {
    await send(HANDOFF_MESSAGE, { handoff: true, reason, ...extra });
    await repo.applyAgentDecision({
      conversationId, intent: "precisa_humano", nextStage: "sem_mudanca", handoff: true, handoffReason: reason,
      agentRole: conv.agent_role, summary: "", opportunity: false, amountCents: null,
    });
    return { outcome: "handoff" as const, violations: [reason] };
  };

  // Limites de consumo
  const tokensToday = await repo.sumAiTokens(local.date);
  if (tokensToday >= (s.ai_daily_token_limit ?? 0)) return handoff("Limite diário de tokens de IA atingido");
  const sinceIso = zonedTimeToUtc(local.date, "00:00", tz).toISOString();
  if ((await repo.countAgentReplies(conversationId, sinceIso)) >= (s.ai_max_replies_per_conversation_day ?? 15)) {
    return handoff("Limite diário de respostas do agente nesta conversa atingido");
  }

  const offer = s.offer ?? DEFAULT_OFFER;
  const role = chooseRole(conv.agent_role, ctx.lead?.stage ?? null);
  const isFirstAgentMessage = !messages.some((m) => m.sender === "agente");
  const turns = buildTurns(messages);
  if (!turns.length) return { outcome: "skipped", reason: "sem mensagens de texto do cliente" };

  let result: LlmResult;
  try {
    result = await deps.llm.decide({
    stablePrompt: buildStablePrompt({ agencyName: s.agency_name ?? "", assistantName: s.assistant_name ?? "Assistente virtual", offer, knowledge: ctx.knowledge }),
    contextPrompt: buildContextPrompt({
      role,
      nowLocal: `${local.date} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
      companyName: ctx.company?.name ?? null,
      companyCategory: ctx.company?.category_label ?? null,
      websiteStatus: ctx.company?.website_status ?? null,
      contactName: conv.contact_name,
      isFirstAgentMessage,
      previousSummary: conv.customer_summary,
    }),
    turns,
    effort: s.ai_effort ?? "low",
  });
  } catch (err) {
    if (err instanceof LlmError && !err.retryable) throw new PermanentError(err.message);
    throw new RetryableError((err as Error).message);
  }

  await repo.recordUsage({
    provider: "anthropic",
    operation: `agent.${role}`,
    units: 1,
    input_tokens: result.usage.input_tokens + result.usage.cache_read_input_tokens + result.usage.cache_creation_input_tokens,
    output_tokens: result.usage.output_tokens,
    estimated_cost_usd: estimateCostUsd(result.usage, s.ai_cost_per_mtok_input_usd ?? 4, s.ai_cost_per_mtok_output_usd ?? 20),
    success: Boolean(result.decision),
    usage_date: local.date,
    job_id: job.id,
    metadata: { conversation_id: conversationId, model: result.model, stop_reason: result.stopReason, ...result.usage },
  });

  const d = result.decision;
  if (!d) return handoff(result.refused ? "Modelo recusou responder" : "Resposta da IA inválida", { model: result.model });

  if (d.intent === "descadastro") {
    await repo.agentOptOut(conversationId, d.customer_summary || "pedido de descadastro");
    return { outcome: "opt_out", intent: d.intent };
  }

  const guard = checkReply(d.reply, {
    offer,
    extraAllowedCents: allowedAmountsFrom(offer, ctx.knowledge),
    isFirstAgentMessage,
    agencyName: s.agency_name ?? "",
  });
  const mustHandoff = d.handoff_to_human || d.intent === "precisa_humano" || !guard.ok;
  const text = !guard.ok || (mustHandoff && !guard.text) ? HANDOFF_MESSAGE : guard.text;
  const newRole = roleAfterDecision(role, d);
  const metadata = { intent: d.intent, role, model: result.model, violations: guard.violations, blocked_reply: guard.ok ? undefined : d.reply };

  if (text) await send(text, metadata);

  const opportunity = d.register_opportunity && d.intent === "quer_contratar";
  await repo.applyAgentDecision({
    conversationId,
    intent: d.intent,
    nextStage: d.next_stage,
    handoff: mustHandoff || opportunity,
    handoffReason: !guard.ok
      ? `Resposta bloqueada pelas travas: ${guard.violations.join("; ")}`
      : opportunity ? "Cliente quer contratar: aprovar oportunidade" : d.handoff_reason || (mustHandoff ? "Cliente precisa de atendimento humano" : ""),
    agentRole: newRole,
    summary: d.customer_summary,
    opportunity,
    amountCents: opportunity ? offer.price_cents : null,
  });

  return {
    outcome: mustHandoff || opportunity ? "handoff" : "replied",
    intent: d.intent,
    violations: guard.violations,
    role: newRole,
  };
}
