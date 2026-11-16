import { describe, expect, it } from "vitest";
import { safeExternalHref, safeInternalPath, safeNextPath } from "@/lib/safe-url";

describe("URLs seguras", () => {
  it("links externos: só http(s)", () => {
    expect(safeExternalHref("https://site.com.br/x")).toBe("https://site.com.br/x");
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,<script>")).toBeNull();
    expect(safeExternalHref("  ")).toBeNull();
  });
  it("redirecionamento pós-login: só caminho interno", () => {
    expect(safeNextPath("/empresas?page=2")).toBe("/empresas?page=2");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", null]) {
      expect(safeNextPath(bad)).toBe("/");
    }
    expect(safeInternalPath("/conversas/abc")).toBe("/conversas/abc");
    expect(safeInternalPath("/\n/evil")).toBeNull();
  });
});
