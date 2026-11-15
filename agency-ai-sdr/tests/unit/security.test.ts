import { describe, expect, it } from "vitest";
import { timingSafeEqualStr } from "@core/security.ts";

describe("timingSafeEqualStr", () => {
  it("compara corretamente", () => {
    expect(timingSafeEqualStr("abc", "abc")).toBe(true);
    expect(timingSafeEqualStr("abc", "abd")).toBe(false);
    expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
    expect(timingSafeEqualStr("", "x")).toBe(false);
  });
});
