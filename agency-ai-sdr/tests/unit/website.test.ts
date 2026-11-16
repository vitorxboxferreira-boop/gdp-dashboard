import { describe, expect, it } from "vitest";
import { classifyWebsite, lacksOwnWebsite } from "@core/website.ts";

describe("classifyWebsite", () => {
  it("ausência de site não é prova: not_identified", () => {
    expect(classifyWebsite(undefined)).toBe("not_identified");
    expect(classifyWebsite("  ")).toBe("not_identified");
  });
  it("redes sociais e plataformas de terceiros: social_only", () => {
    for (const u of ["https://www.instagram.com/x", "http://m.facebook.com/x", "https://wa.me/5555", "linktr.ee/abc", "https://www.ifood.com.br/delivery/x"]) {
      expect(classifyWebsite(u)).toBe("social_only");
    }
  });
  it("domínio próprio: identified", () => {
    expect(classifyWebsite("https://www.padariaexemplo.com.br/")).toBe("identified");
    expect(classifyWebsite("https://notinstagram.com")).toBe("identified");
  });
  it("oportunidade quando não há site próprio", () => {
    expect(lacksOwnWebsite("social_only")).toBe(true);
    expect(lacksOwnWebsite("identified")).toBe(false);
  });
});
