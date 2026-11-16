import { describe, expect, it } from "vitest";
import { formatBrPhone, isBrMobile, normalizeBrPhone } from "@core/phone.ts";

describe("normalizeBrPhone", () => {
  it.each([
    ["+55 55 99999-1234", "+5555999991234"],
    ["(55) 99999-1234", "+5555999991234"],
    ["(55) 3242-1234", "+555532421234"],
    ["055 3242-1234", "+555532421234"],
    ["0 21 55 3242-1234", "+555532421234"],
    ["5555999991234", "+5555999991234"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeBrPhone(input)).toBe(expected);
  });

  it.each([
    [null], [""], ["123"], ["+1 415 555 0100"], ["(00) 90000-0001"], ["(55) 89999-1234"], ["(55) 1242-1234"],
  ])("rejeita %s", (input) => {
    expect(normalizeBrPhone(input as string | null)).toBeNull();
  });

  it("identifica celular sem presumir WhatsApp", () => {
    expect(isBrMobile("+5555999991234")).toBe(true);
    expect(isBrMobile("+555532421234")).toBe(false);
    expect(formatBrPhone("+5555999991234")).toBe("(55) 99999-1234");
  });
});
