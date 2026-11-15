// Verifica a requisição real montada pelo SDK oficial (fetch interceptado, sem rede).
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { createAnthropicLlm, LlmError } from "@core/anthropic-llm.ts";

const decision = {
  reply: "Olá! Sou o assistente virtual. Como posso ajudar?", intent: "saudacao", next_stage: "sem_mudanca",
  handoff_to_human: false, handoff_reason: "", register_opportunity: false, customer_summary: "Quer saber sobre sites.",
};

function apiResponse(over: Record<string, unknown> = {}, text = JSON.stringify(decision)) {
  return new Response(JSON.stringify({
    id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5",
    content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 80, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 },
    ...over,
  }), { status: 200, headers: { "content-type": "application/json", "request-id": "req_1" } });
}

function llm(fetchImpl: (url: string, init: RequestInit) => Promise<Response>) {
  const client = new Anthropic({ apiKey: "sk-ant-test", fetch: fetchImpl as unknown as typeof fetch, maxRetries: 0 });
  return createAnthropicLlm({ client, model: "claude-opus-5-5" });
}
const input = { stablePrompt: "REGRAS", contextPrompt: "CONTEXTO", turns: [{ role: "user" as const, content: "oi" }], effort: "low" as const };

describe("adaptador Anthropic", () => {
  it("monta a requisição com saída estruturada, cache, esforço e fallback de recusa", async () => {
    const fetchImpl = vi.fn(async () => apiResponse());
    const res = await llm(fetchImpl).decide(input);
    expect(res.decision).toEqual(decision);
    expect(res.usage).toEqual({ input_tokens: 120, output_tokens: 80, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("/v1/messages");
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(headers.get("authorization")).toBe("Bearer sk-ant-test");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect(body.output_config.effort).toBe("low");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(Object.keys(body.output_config.format.schema.properties)).toEqual(
      expect.arrayContaining(["reply", "intent", "next_stage", "handoff_to_human", "register_opportunity"]),
    );
    expect(body.system[0]).toMatchObject({ type: "text", text: "REGRAS", cache_control: { type: "ephemeral" } });
    expect(body.system[1]).toEqual({ type: "text", text: "CONTEXTO" });
    expect(body.thinking).toBeUndefined(); // Opus 5.5: pensamento adaptativo padrão
    expect(body.messages).toEqual([{ role: "user", content: "oi" }]);
  });

  it("JSON inválido ou corte por max_tokens → sem decisão (sem exceção)", async () => {
    expect((await llm(vi.fn(async () => apiResponse({}, "não é json"))).decide(input)).decision).toBeNull();
    expect((await llm(vi.fn(async () => apiResponse({ stop_reason: "max_tokens" }, '{"reply":'))).decide(input)).decision).toBeNull();
    expect((await llm(vi.fn(async () => apiResponse({}, JSON.stringify({ ...decision, intent: "invalida" })))).decide(input)).decision).toBeNull();
  });

  it("recusa → sem decisão", async () => {
    const res = await llm(vi.fn(async () => apiResponse({ stop_reason: "refusal", stop_details: { type: "refusal", category: null, explanation: null } }, ""))).decide(input);
    expect(res).toMatchObject({ decision: null, refused: true });
  });

  it("erros: chave inválida não repete; limite de taxa repete", async () => {
    const err = (status: number, type: string) => vi.fn(async () => new Response(JSON.stringify({ type: "error", error: { type, message: "x" } }), { status, headers: { "content-type": "application/json" } }));
    await expect(llm(err(401, "authentication_error")).decide(input)).rejects.toMatchObject({ retryable: false });
    await expect(llm(err(429, "rate_limit_error")).decide(input)).rejects.toMatchObject({ retryable: true });
    await expect(llm(err(500, "api_error")).decide(input)).rejects.toBeInstanceOf(LlmError);
  });
});
