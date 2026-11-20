import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "@/lib/auth-errors";

describe("mensagens de erro do login", () => {
  it("credenciais inválidas: mensagem genérica", () => {
    expect(loginErrorMessage({ code: "invalid_credentials", status: 400, message: "Invalid login credentials" })).toBe("E-mail ou senha incorretos.");
  });
  it("distingue problemas de configuração e de confirmação", () => {
    expect(loginErrorMessage({ code: "email_not_confirmed", status: 400 })).toMatch(/não confirmado/);
    expect(loginErrorMessage({ status: 401, message: "Invalid API key" })).toMatch(/PUBLISHABLE_KEY/);
    expect(loginErrorMessage({ name: "AuthRetryableFetchError", status: 0, message: "fetch failed" })).toMatch(/SUPABASE_URL/);
    expect(loginErrorMessage({ status: 429 })).toMatch(/Muitas tentativas/);
    expect(loginErrorMessage({ code: "unexpected_failure", status: 500 })).toMatch(/unexpected_failure/);
  });
});

import { cleanKey, cleanUrl } from "@/lib/public-env";
describe("limpeza das variáveis públicas", () => {
  it("remove espaços/quebras de linha e barra final", () => {
    expect(cleanKey(" sb_publishable_abc123\n")).toBe("sb_publishable_abc123");
    expect(cleanKey('"eyJhbGciOi.J9 x"')).toBe("eyJhbGciOi.J9x");
    expect(cleanUrl(" https://abc.supabase.co/ \n")).toBe("https://abc.supabase.co");
    expect(cleanUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
  });
});

describe("segurança do /api/health", () => {
  it("resposta pública não expõe projeto, chave ou estado da conexão", async () => {
    const src = (await import("node:fs")).readFileSync(new URL("../../src/app/api/health/route.ts", import.meta.url), "utf8");
    const publicBranch = src.slice(src.indexOf('if (url.searchParams.get("deep") !== "1")'), src.indexOf("const token = process.env.HEALTHCHECK_TOKEN"));
    expect(publicBranch).not.toMatch(/supabase|projeto|autenticacao|Key/i);
    expect(publicBranch).toMatch(/status: "ok"/);
  });
});
