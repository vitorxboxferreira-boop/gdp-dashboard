import { describe, expect, it } from "vitest";
import { scoreCompany, type ScoringInput, scoringConfigFromSettings } from "@core/scoring.ts";

const config = scoringConfigFromSettings({ category_weights: { beauty_salon: 15, bakery: 13, _default: 8 }, scoring_thresholds: { alta: 70, media: 45 } });
const base: ScoringInput = {
  website_status: "not_identified", primary_category: "beauty_salon", types: ["beauty_salon"],
  phone_e164: "+5555999991234", formatted_address: "Rua A, 1", business_status: "OPERATIONAL", rating: 4.7, user_rating_count: 86,
};

describe("Analyst — pontuação", () => {
  it("empresa ativa sem site identificado e com celular: alta prioridade", () => {
    const r = scoreCompany(base, config);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.priority).toBe("alta");
    expect(r.needsVerification).toContain("Confirmar se a empresa possui site");
    expect(r.reasons.every((x) => x.detail.length > 0)).toBe(true);
  });

  it("pontuação máxima nunca passa de 100", () => {
    expect(scoreCompany({ ...base, website_status: "verified_none" }, config).score).toBe(100);
  });

  it("empresa com site próprio: baixa prioridade", () => {
    const r = scoreCompany({ ...base, website_status: "identified", website_uri: "https://x.com.br" }, config);
    expect(r.priority).toBe("baixa");
  });

  it("sem telefone: necessita verificação", () => {
    const r = scoreCompany({ ...base, phone_e164: null }, config);
    expect(r.priority).toBe("verificar");
    expect(r.needsVerification).toContain("Obter telefone de contato válido");
  });

  it("fechada permanentemente: 0 pontos", () => {
    const r = scoreCompany({ ...base, business_status: "CLOSED_PERMANENTLY" }, config);
    expect(r).toMatchObject({ score: 0, priority: "baixa" });
  });

  it("poucos dados: média/baixa, nunca alta", () => {
    const r = scoreCompany({ ...base, primary_category: "unknown_type", types: [], phone_e164: "+555532421234", rating: null, user_rating_count: 0, formatted_address: null }, config);
    expect(["media", "baixa"]).toContain(r.priority);
  });

  it("é determinística", () => {
    expect(scoreCompany(base, config)).toEqual(scoreCompany(base, config));
  });
});
