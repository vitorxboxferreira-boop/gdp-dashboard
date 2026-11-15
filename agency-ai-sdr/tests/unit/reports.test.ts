import { describe, expect, it } from "vitest";
import { parsePeriod, REPORT_FIELDS } from "@/lib/reports";

describe("período de relatório", () => {
  it("padrão: últimos 7 dias em horário de Brasília", () => {
    expect(parsePeriod(undefined, undefined, new Date("2026-11-17T02:00:00Z"))).toEqual({ from: "2026-11-10", to: "2026-11-16" });
  });
  it("aceita datas válidas, inverte se necessário e ignora inválidas", () => {
    expect(parsePeriod("2026-11-01", "2026-11-05")).toEqual({ from: "2026-11-01", to: "2026-11-05" });
    expect(parsePeriod("2026-11-05", "2026-11-01")).toEqual({ from: "2026-11-01", to: "2026-11-05" });
    expect(parsePeriod("x'; drop", "2026-11-05").from).toBe("2026-10-30");
  });
  it("campos cobrem receita e custos", () => {
    const keys = REPORT_FIELDS.map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["revenue_cents", "cost_ai_usd", "meetings_confirmed", "handoffs"]));
  });
});
