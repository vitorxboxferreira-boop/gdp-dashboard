"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zonedParts } from "@core/schedule.ts";
import {
  allowedAmountsFrom, buildContextPrompt, buildStablePrompt, checkReply, estimateCostUsd, type ChatTurn, type KnowledgeEntry, type Offer,
} from "@core/sdr-agent.ts";
import { buildAgentDeps } from "@/lib/agent-deps";
import { requireActionRole } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bool, fail, ok, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

// ---------------------------------------------------------------------------
// Configurações da IA (admin)
// ---------------------------------------------------------------------------
export async function saveAiSettings(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const enabled = bool(fd, "ai_enabled");
    const supabase = await createSupabaseServerClient();
    if (enabled) {
      if (!serverEnv.anthropicApiKey) return fail("Defina ANTHROPIC_API_KEY no servidor antes de habilitar a IA.");
      const { data: s } = await supabase.from("agent_settings").select("whatsapp_enabled").eq("id", 1).single();
      if (!s?.whatsapp_enabled) return fail("Habilite e valide o WhatsApp antes de ligar as respostas automáticas.");
      if (!bool(fd, "ai_ack")) return fail("Confirme ciência do custo e de que testou o agente no simulador.");
    }
    const days = fd.getAll("agent_days").map(Number).filter((d) => d >= 0 && d <= 6);
    const v = z
      .object({
        agency_name: z.string().max(120),
        assistant_name: z.string().min(2, "Nome do assistente").max(60),
        ai_effort: z.enum(["low", "medium", "high"]),
        ai_max_replies_per_conversation_day: z.coerce.number().int().min(1).max(100),
        agent_hours_start: z.string().regex(/^\d{2}:\d{2}$/, "Horário inicial inválido"),
        agent_hours_end: z.string().regex(/^\d{2}:\d{2}$/, "Horário final inválido"),
      })
      .parse({
        agency_name: str(fd, "agency_name"),
        assistant_name: str(fd, "assistant_name"),
        ai_effort: str(fd, "ai_effort"),
        ai_max_replies_per_conversation_day: str(fd, "ai_max_replies_per_conversation_day"),
        agent_hours_start: str(fd, "agent_hours_start"),
        agent_hours_end: str(fd, "agent_hours_end"),
      });
    if (v.agent_hours_end <= v.agent_hours_start) return fail("O horário final deve ser depois do inicial.");
    if (!days.length) return fail("Selecione ao menos um dia de atendimento.");
    const { error, count } = await supabase
      .from("agent_settings")
      .update({ ...v, agent_days: days, ai_enabled: enabled, updated_by: profile.id }, { count: "exact" })
      .eq("id", 1);
    if (error) throw error;
    if (!count) throw new Error("permission denied");
    revalidatePath("/", "layout");
    return ok(enabled ? "IA habilitada. O modo de teste do WhatsApp continua limitando os destinatários." : "Configurações da IA salvas.");
  } catch (e) {
    return toResult(e);
  }
}

// ---------------------------------------------------------------------------
// Base de conhecimento (admin)
// ---------------------------------------------------------------------------
const KINDS = ["servico", "faq", "objecao", "condicao", "limitacao", "portfolio"] as const;

export async function saveKnowledge(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const id = str(fd, "id");
    const v = z
      .object({
        kind: z.enum(KINDS, { message: "Tipo inválido" }),
        title: z.string().min(3, "Título muito curto").max(200),
        content: z.string().min(10, "Conteúdo muito curto").max(4000),
        url: z.string().url("URL inválida").nullable(),
        client_authorized: z.boolean(),
        authorization_note: z.string().max(500).nullable(),
        active: z.boolean(),
        sort_order: z.coerce.number().int().min(0).max(10000),
      })
      .parse({
        kind: str(fd, "kind"),
        title: str(fd, "title"),
        content: str(fd, "content"),
        url: str(fd, "url") || null,
        client_authorized: bool(fd, "client_authorized"),
        authorization_note: str(fd, "authorization_note") || null,
        active: id ? bool(fd, "active") : true,
        sort_order: str(fd, "sort_order") || 100,
      });
    if (v.kind === "portfolio" && (!v.client_authorized || !v.url || (v.authorization_note ?? "").length < 10)) {
      return fail("Portfólio exige projeto REAL, URL, autorização do cliente marcada e descrição de como a autorização foi obtida.");
    }
    const supabase = await createSupabaseServerClient();
    const { error } = id
      ? await supabase.from("knowledge_base").update(v).eq("id", z.string().uuid().parse(id))
      : await supabase.from("knowledge_base").insert({ ...v, created_by: profile.id });
    if (error) throw error;
    revalidatePath("/agentes");
    return ok("Base de conhecimento atualizada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteKnowledge(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("knowledge_base").delete().eq("id", z.string().uuid().parse(str(fd, "id")));
    if (error) throw error;
    revalidatePath("/agentes");
    return ok("Item removido.");
  } catch (e) {
    return toResult(e);
  }
}

// ---------------------------------------------------------------------------
// Simulador: testa o agente sem enviar nada pelo WhatsApp.
// ---------------------------------------------------------------------------
export interface SimulationResult {
  ok: boolean;
  message: string;
  history?: ChatTurn[];
  reply?: string;
  intent?: string;
  nextStage?: string;
  handoff?: boolean;
  violations?: string[];
  blockedReply?: string;
  costUsd?: number;
}

export async function simulateAgent(prev: SimulationResult | null, fd: FormData): Promise<SimulationResult> {
  try {
    await requireActionRole("operator");
    const deps = buildAgentDeps();
    if (!deps.llm) return { ok: false, message: "Defina ANTHROPIC_API_KEY no servidor para usar o simulador." };
    if (str(fd, "reset") === "1") return { ok: true, message: "Simulação reiniciada.", history: [] };
    const text = z.string().trim().min(1, "Escreva a mensagem do cliente").max(2000).parse(str(fd, "message"));
    const role = str(fd, "role") === "closer" ? "closer" : "sdr";
    const history: ChatTurn[] = prev?.history ?? [];

    const s = await deps.repo.getSettings();
    const supabase = await createSupabaseServerClient();
    const { data: kb } = await supabase.from("knowledge_base").select("kind, title, content, url").eq("active", true).order("sort_order");
    const knowledge = (kb ?? []) as KnowledgeEntry[];
    const offer = s.offer as Offer;
    const local = zonedParts(new Date(), s.timezone);
    const isFirst = !history.some((t) => t.role === "assistant");
    const turns: ChatTurn[] = [...history, { role: "user", content: text }];

    const result = await deps.llm.decide({
      stablePrompt: buildStablePrompt({ agencyName: s.agency_name ?? "", assistantName: s.assistant_name ?? "Assistente virtual", offer, knowledge }),
      contextPrompt: buildContextPrompt({
        role, nowLocal: `${local.date} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
        companyName: null, companyCategory: null, websiteStatus: null, contactName: "Cliente (simulação)", isFirstAgentMessage: isFirst, previousSummary: null,
      }),
      turns,
      effort: s.ai_effort ?? "low",
    });
    const cost = estimateCostUsd(result.usage, s.ai_cost_per_mtok_input_usd ?? 4, s.ai_cost_per_mtok_output_usd ?? 20);
    await deps.repo.recordUsage({
      provider: "anthropic", operation: "agent.simulation", units: 1, usage_date: local.date, success: Boolean(result.decision),
      input_tokens: result.usage.input_tokens + result.usage.cache_read_input_tokens + result.usage.cache_creation_input_tokens,
      output_tokens: result.usage.output_tokens, estimated_cost_usd: cost, metadata: { model: result.model, simulation: true },
    });
    const d = result.decision;
    if (!d) return { ok: false, message: result.refused ? "O modelo recusou responder (em produção: equipe assume)." : "Resposta inválida da IA (em produção: equipe assume).", history, costUsd: cost };

    const guard = checkReply(d.reply, { offer, extraAllowedCents: allowedAmountsFrom(offer, knowledge), isFirstAgentMessage: isFirst, agencyName: s.agency_name ?? "" });
    const shown = guard.ok ? guard.text : "(bloqueada pelas travas — em produção seria enviada a mensagem de transferência para humano)";
    return {
      ok: true,
      message: "Simulação concluída. Nada foi enviado.",
      history: [...turns, { role: "assistant", content: guard.ok ? guard.text : "[resposta bloqueada]" }],
      reply: shown,
      intent: d.intent,
      nextStage: d.next_stage,
      handoff: d.handoff_to_human || !guard.ok,
      violations: guard.violations,
      blockedReply: guard.ok ? undefined : d.reply,
      costUsd: cost,
    };
  } catch (e) {
    const r = toResult(e);
    return { ok: false, message: r.message, history: prev?.history };
  }
}
