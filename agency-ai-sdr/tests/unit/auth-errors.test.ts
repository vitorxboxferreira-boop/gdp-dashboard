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
