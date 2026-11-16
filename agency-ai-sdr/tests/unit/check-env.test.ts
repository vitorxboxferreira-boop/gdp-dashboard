import { describe, expect, it } from "vitest";
// @ts-expect-error módulo JS sem tipos
import { checkEnv } from "../../scripts/check-env.mjs";

const base = {
  APP_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  SUPABASE_SECRET_KEY: "sb_secret_x",
  HEALTHCHECK_TOKEN: "h".repeat(40),
};

describe("check-env", () => {
  it("produção válida", () => {
    expect(checkEnv(base, "production").errors).toEqual([]);
  });
  it("detecta segredo exposto, mistura de ambientes e WhatsApp incompleto", () => {
    const { errors } = checkEnv({
      ...base, APP_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_ANTHROPIC_API_KEY: "x", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_oops",
      WHATSAPP_ACCESS_TOKEN: "t", CRON_SECRET: "curto",
    }, "production");
    expect(errors.join("\n")).toMatch(/APP_ENV deve ser "production"/);
    expect(errors.join("\n")).toMatch(/ambiente local/);
    expect(errors.join("\n")).toMatch(/NEXT_PUBLIC_ANTHROPIC_API_KEY/);
    expect(errors.join("\n")).toMatch(/parece ser a chave secreta/);
    expect(errors.join("\n")).toMatch(/WhatsApp incompleto/);
    expect(errors.join("\n")).toMatch(/CRON_SECRET/);
  });
  it("desenvolvimento não pode declarar APP_ENV=production", () => {
    expect(checkEnv(base, "development").errors.join()).toMatch(/misturar credenciais/);
  });
});
