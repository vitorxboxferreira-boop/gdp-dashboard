import { describe, expect, it } from "vitest";
import {
  allowedAmountsFrom, buildContextPrompt, buildStablePrompt, buildTurns, checkReply, chooseRole, estimateCostUsd,
  extractBRLAmounts, roleAfterDecision, withinAgentHours, type ChatMessage, type Offer,
} from "@core/sdr-agent.ts";

const offer: Offer = {
  product_name: "Site profissional", price_cents: 25000, currency: "BRL",
  includes: ["Página profissional", "Botão de WhatsApp"], not_included: ["Domínio: cerca de R$ 40,00 por ano no registro.br"],
  max_discount_percent: 10, payment_terms: "", delivery_time: "",
};
const ctx = { offer, extraAllowedCents: allowedAmountsFrom(offer, []), isFirstAgentMessage: false, agencyName: "Agência X" };

describe("travas da resposta", () => {
  it("aceita preço da oferta, desconto dentro do limite e custos informados", () => {
    expect(checkReply("O site sai por R$ 250,00 e o domínio custa cerca de R$ 40,00 por ano.", ctx).ok).toBe(true);
    expect(checkReply("Consigo fazer por R$ 225,00 (10% de desconto).", ctx).ok).toBe(true);
  });
  it("bloqueia valores e descontos não autorizados", () => {
    expect(checkReply("Faço por R$ 199,00 pra você!", ctx).violations[0]).toMatch(/valor não autorizado/);
    expect(checkReply("Te dou 20% de desconto.", ctx).violations).toContain("desconto acima do autorizado: 20%");
    const noDiscount = { ...ctx, offer: { ...offer, max_discount_percent: 0 } };
    expect(checkReply("Posso fazer um desconto especial.", noDiscount).ok).toBe(false);
  });
  it.each([
    ["O domínio é grátis no primeiro ano!", "promessa de domínio/hospedagem grátis"],
    ["Hospedagem gratuita inclusa.", "promessa de domínio/hospedagem grátis"],
    ["Inclui manutenção vitalícia.", "promessa de manutenção vitalícia"],
    ["Garanto que suas vendas vão dobrar.", "garantia de resultado"],
    ["Seu pagamento foi confirmado!", "confirmação de pagamento"],
    ["Pronto, reunião confirmada para amanhã às 10h.", "confirmação de reunião"],
    ["Sou uma atendente da agência.", "fingir ser humano"],
  ])("bloqueia: %s", (text, label) => {
    expect(checkReply(text, ctx).violations).toContain(label);
  });
  it("não bloqueia negativas honestas", () => {
    expect(checkReply("Não garantimos aumento de vendas, mas o site ajuda a ser encontrado.", ctx).ok).toBe(true);
    expect(checkReply("A reunião será confirmada pela equipe.", ctx).ok).toBe(true);
  });
  it("primeira mensagem sempre se identifica como assistente virtual", () => {
    const r = checkReply("Oi! Como posso ajudar?", { ...ctx, isFirstAgentMessage: true });
    expect(r.text).toMatch(/^Olá! Sou o assistente virtual da Agência X/);
    expect(checkReply("Oi! Sou o assistente virtual da Agência X.", { ...ctx, isFirstAgentMessage: true }).text).toBe("Oi! Sou o assistente virtual da Agência X.");
  });
  it("limita tamanho", () => {
    expect(checkReply("a".repeat(1200), ctx).ok).toBe(false);
  });
  it("extrai valores em reais", () => {
    expect(extractBRLAmounts("R$ 250, R$1.250,50 e R$ 40,5")).toEqual([25000, 125050, 4050]);
  });
});

describe("prompt e histórico", () => {
  it("prompt estável não tem data/hora (cache) e contém regras e oferta", () => {
    const p = buildStablePrompt({ agencyName: "Agência X", assistantName: "Lia", offer, knowledge: [] });
    expect(p).toContain("assistente virtual de Agência X");
    expect(p).toContain("R$ 250,00");
    expect(p).toContain("no máximo 10%");
    expect(p).toContain("Nenhum projeto autorizado");
    expect(p).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    const c = buildContextPrompt({ role: "closer", nowLocal: "2026-11-17 10:00", companyName: null, companyCategory: null, websiteStatus: null, contactName: "Ana", isFirstAgentMessage: true, previousSummary: null });
    expect(c).toContain("Closer");
    expect(c).toContain("PRIMEIRA mensagem");
  });
  it("monta turnos alternados começando no cliente e marca mensagens da equipe", () => {
    const m = (direction: "inbound" | "outbound", sender: ChatMessage["sender"], body: string): ChatMessage =>
      ({ direction, sender, body, message_type: "text", wa_message_id: null, created_at: "" });
    const turns = buildTurns([
      m("outbound", "humano", "antes"), m("inbound", "cliente", "oi"), m("inbound", "cliente", "tudo bem?"),
      m("outbound", "humano", "Olá!"), m("inbound", "cliente", "quanto custa?"),
    ]);
    expect(turns).toEqual([
      { role: "user", content: "oi\ntudo bem?" },
      { role: "assistant", content: "[Equipe] Olá!" },
      { role: "user", content: "quanto custa?" },
    ]);
  });
});

describe("papéis, custo e horário", () => {
  it("passa para Closer com intenção forte", () => {
    expect(chooseRole("sdr", "interessado")).toBe("closer");
    expect(chooseRole("sdr", "qualificado")).toBe("sdr");
    expect(roleAfterDecision("sdr", { intent: "pediu_preco", next_stage: "sem_mudanca" })).toBe("closer");
    expect(roleAfterDecision("sdr", { intent: "duvida", next_stage: "sem_mudanca" })).toBe("sdr");
  });
  it("estima custo com cache", () => {
    expect(estimateCostUsd({ input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 10000, cache_creation_input_tokens: 0 }, 4, 20)).toBeCloseTo(0.018, 6);
  });
  it("horário de atendimento", () => {
    const cfg = { days: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" };
    expect(withinAgentHours({ weekday: 1, hour: 9, minute: 0 }, cfg)).toBe(true);
    expect(withinAgentHours({ weekday: 1, hour: 18, minute: 0 }, cfg)).toBe(false);
    expect(withinAgentHours({ weekday: 6, hour: 10, minute: 0 }, cfg)).toBe(false);
  });
});
