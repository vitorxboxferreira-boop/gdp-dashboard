import { describe, expect, it } from "vitest";
import { isOperatingDay, withinStartWindow, zonedParts, zonedTimeToUtc } from "@core/schedule.ts";

describe("calendário America/Sao_Paulo", () => {
  it("08:00 em São Paulo = 11:00 UTC", () => {
    expect(zonedTimeToUtc("2026-11-16", "08:00").toISOString()).toBe("2026-11-16T11:00:00.000Z");
  });
  it("partes locais a partir de UTC (virada de dia)", () => {
    const p = zonedParts(new Date("2026-11-17T02:30:00Z"));
    expect(p).toMatchObject({ date: "2026-11-16", hour: 23, minute: 30, weekday: 1 });
  });
  it("não opera em fins de semana e feriados sem configuração explícita", () => {
    const opts = { holidays: ["2026-11-20"], runOnWeekends: false, runOnHolidays: false };
    expect(isOperatingDay({ date: "2026-11-21", weekday: 6 }, opts).ok).toBe(false);
    expect(isOperatingDay({ date: "2026-11-20", weekday: 5 }, opts).ok).toBe(false);
    expect(isOperatingDay({ date: "2026-11-19", weekday: 4 }, opts).ok).toBe(true);
    expect(isOperatingDay({ date: "2026-11-21", weekday: 6 }, { ...opts, runOnWeekends: true }).ok).toBe(true);
  });
  it("janela de início da campanha", () => {
    expect(withinStartWindow({ hour: 7, minute: 59 })).toBe(false);
    expect(withinStartWindow({ hour: 8, minute: 0 })).toBe(true);
    expect(withinStartWindow({ hour: 13, minute: 0 })).toBe(false);
  });
});
