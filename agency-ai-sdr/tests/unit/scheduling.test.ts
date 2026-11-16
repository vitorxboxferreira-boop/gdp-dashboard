import { describe, expect, it } from "vitest";
import { computeAvailableSlots, formatSlotPtBr, type MeetingConfig } from "@core/scheduling.ts";
import { renderTemplatePreview, sendTemplateMessage } from "@core/whatsapp.ts";
import { vi } from "vitest";

const cfg: MeetingConfig = { days: [1, 2, 3, 4, 5], start: "09:00", end: "12:00", durationMin: 30, bufferMin: 15, maxPerDay: 4, minNoticeHours: 2, horizonDays: 7, timezone: "America/Sao_Paulo" };
const iso = (d: Date) => d.toISOString();

describe("horários livres", () => {
  it("respeita expediente, duração+intervalo e antecedência", () => {
    const now = new Date("2026-11-16T12:30:00Z"); // segunda 09:30 SP → mínimo 11:30
    const slots = computeAvailableSlots(cfg, [], [], now, 6).map(iso);
    // segunda: 09:00, 09:45, 10:30, 11:15 (fim 11:45) → só >= 11:30 nenhum; terça começa 09:00
    expect(slots[0]).toBe("2026-11-17T12:00:00.000Z");
    expect(slots.slice(0, 4)).toEqual(["2026-11-17T12:00:00.000Z", "2026-11-17T12:45:00.000Z", "2026-11-17T13:30:00.000Z", "2026-11-17T14:15:00.000Z"]);
  });
  it("pula fins de semana, feriados, conflitos (com intervalo) e dias lotados", () => {
    const now = new Date("2026-11-19T15:00:00Z"); // quinta 12:00
    const busy = [{ starts_at: "2026-11-23T12:00:00Z", ends_at: "2026-11-23T12:30:00Z", status: "confirmada" }];
    const slots = computeAvailableSlots(cfg, busy, ["2026-11-20"], now, 3).map(iso);
    // sexta 20 é feriado, 21/22 fim de semana; segunda 23 09:00 ocupado → 09:45 também conflita pelo intervalo? 09:45 - 15 = 09:30 >= 09:30 fim → livre
    expect(slots[0]).toBe("2026-11-23T12:45:00.000Z");
    const full = Array.from({ length: 4 }, (_, i) => ({ starts_at: `2026-11-23T1${3 + i}:00:00Z`, ends_at: `2026-11-23T1${3 + i}:30:00Z`, status: "confirmada" }));
    expect(computeAvailableSlots(cfg, full, ["2026-11-20"], now, 1).map(iso)[0]).toBe("2026-11-24T12:00:00.000Z");
  });
  it("formata em português", () => {
    expect(formatSlotPtBr(new Date("2026-11-17T12:00:00Z"), "America/Sao_Paulo")).toBe("terça, 17/11 às 09:00");
  });
});

describe("templates", () => {
  it("monta a requisição oficial de template com parâmetros", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.T" }] }), { status: 200 }));
    await sendTemplateMessage({ accessToken: "t", phoneNumberId: "p", graphVersion: "v23.0", fetchImpl }, "+5555999991234", { name: "boas_vindas", language: "pt_BR", bodyParams: ["Carla"] });
    expect(JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({
      messaging_product: "whatsapp", recipient_type: "individual", to: "5555999991234", type: "template",
      template: { name: "boas_vindas", language: { code: "pt_BR" }, components: [{ type: "body", parameters: [{ type: "text", text: "Carla" }] }] },
    });
    expect(renderTemplatePreview("Olá {{1}}, tudo bem? {{2}}", ["Carla"])).toBe("Olá Carla, tudo bem? {{2}}");
  });
});
