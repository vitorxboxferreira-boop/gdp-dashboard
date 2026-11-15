// Adaptador do modelo de IA (Anthropic, SDK oficial).
// Em Node resolve "@anthropic-ai/sdk" do node_modules; nas Edge Functions (Deno)
// pelo import map em supabase/functions/deno.json.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AgentDecisionSchema, type AgentDecision, type ChatTurn } from "./sdr-agent.ts";

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface LlmResult {
  decision: AgentDecision | null;
  refused: boolean;
  stopReason: string | null;
  model: string;
  usage: LlmUsage;
}

export interface AgentLlm {
  decide(input: {
    stablePrompt: string;
    contextPrompt: string;
    turns: ChatTurn[];
    effort: "low" | "medium" | "high";
  }): Promise<LlmResult>;
}

export class LlmError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "LlmError";
  }
}

export function createAnthropicLlm(opts: { client: Anthropic; model: string }): AgentLlm {
  return {
    async decide({ stablePrompt, contextPrompt, turns, effort }) {
      try {
        const response = await opts.client.beta.messages.create({
          model: opts.model,
          max_tokens: 8000,
          // Recusas de segurança: o servidor tenta novamente em um modelo de fallback.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort, format: betaZodOutputFormat(AgentDecisionSchema) },
          system: [
            // Regras + oferta + base de conhecimento: estável → cacheado.
            { type: "text", text: stablePrompt, cache_control: { type: "ephemeral" } },
            // Contexto da conversa (muda a cada chamada) fica depois do ponto de cache.
            { type: "text", text: contextPrompt },
          ],
          messages: turns.map((t) => ({ role: t.role, content: t.content })),
        });
        const u = response.usage;
        const usage = {
          input_tokens: u.input_tokens ?? 0,
          output_tokens: u.output_tokens ?? 0,
          cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
        };
        const base = { stopReason: response.stop_reason ?? null, model: response.model, usage };
        // Verifica recusa/corte ANTES de interpretar o conteúdo.
        if (response.stop_reason === "refusal") return { ...base, decision: null, refused: true };
        if (response.stop_reason === "max_tokens") return { ...base, decision: null, refused: false };
        const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          return { ...base, decision: null, refused: false };
        }
        const parsed = AgentDecisionSchema.safeParse(json);
        return { ...base, decision: parsed.success ? parsed.data : null, refused: false };
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError || err instanceof Anthropic.APIConnectionError) {
          throw new LlmError(`IA indisponível no momento: ${err.message}`, true);
        }
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
          throw new LlmError("Chave da Anthropic inválida ou sem permissão", false);
        }
        if (err instanceof Anthropic.APIError) {
          throw new LlmError(`Erro da API de IA (${err.status}): ${err.message}`, (err.status ?? 0) >= 500);
        }
        throw new LlmError(`Falha ao interpretar a resposta da IA: ${(err as Error).message}`, false);
      }
    },
  };
}
