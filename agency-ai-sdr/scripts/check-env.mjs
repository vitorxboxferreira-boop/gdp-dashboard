#!/usr/bin/env node
// Validação de variáveis de ambiente antes do deploy.
// Uso: node scripts/check-env.mjs [--target=production|development]  (lê process.env)
// Sai com código 1 se houver erros. Nunca imprime valores de segredos.

const SECRET_NAMES = /(SECRET|TOKEN|SERVICE_ROLE|API_KEY|PASSWORD|PRIVATE)/i;

/** @param {Record<string, string | undefined>} env @param {"production"|"development"} target */
export function checkEnv(env, target) {
  const errors = [];
  const warnings = [];
  const has = (k) => Boolean(env[k] && String(env[k]).trim());
  const len = (k) => String(env[k] ?? "").trim().length;

  // Chaves privadas nunca podem ser públicas
  for (const k of Object.keys(env)) {
    if (k.startsWith("NEXT_PUBLIC_") && SECRET_NAMES.test(k.slice("NEXT_PUBLIC_".length)) && !/PUBLISHABLE|ANON/.test(k)) {
      errors.push(`${k}: segredo com prefixo NEXT_PUBLIC_ seria exposto no navegador`);
    }
  }
  const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (/^sb_secret_/.test(pub) || /service_role/.test(pub)) errors.push("Chave pública do Supabase parece ser a chave secreta");

  // Obrigatórias
  if (!has("NEXT_PUBLIC_SUPABASE_URL")) errors.push("NEXT_PUBLIC_SUPABASE_URL ausente");
  if (!pub) errors.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente");
  if (!has("SUPABASE_SECRET_KEY") && !has("SUPABASE_SERVICE_ROLE_KEY")) errors.push("SUPABASE_SECRET_KEY ausente");

  const appEnv = env.APP_ENV ?? "development";
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (target === "production") {
    if (appEnv !== "production") errors.push(`APP_ENV deve ser "production" (atual: "${appEnv}")`);
    if (/localhost|127\.0\.0\.1/.test(url)) errors.push("NEXT_PUBLIC_SUPABASE_URL aponta para ambiente local");
    if (url && !url.startsWith("https://")) errors.push("NEXT_PUBLIC_SUPABASE_URL deve usar https");
    if (!has("HEALTHCHECK_TOKEN")) warnings.push("HEALTHCHECK_TOKEN ausente: monitor externo não poderá usar /api/health?deep=1");
  } else if (appEnv === "production") {
    errors.push('APP_ENV="production" em ambiente de desenvolvimento: risco de misturar credenciais');
  }

  for (const k of ["CRON_SECRET", "HEALTHCHECK_TOKEN"]) {
    if (has(k) && len(k) < 32) errors.push(`${k} deve ter pelo menos 32 caracteres`);
  }

  // Integrações (opcionais, mas coerentes quando presentes)
  const wa = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_WEBHOOK_VERIFY_TOKEN"];
  const waSet = wa.filter(has);
  if (waSet.length && waSet.length < wa.length) errors.push(`WhatsApp incompleto: faltam ${wa.filter((k) => !has(k)).join(", ")}`);
  if (has("WHATSAPP_WEBHOOK_VERIFY_TOKEN") && len("WHATSAPP_WEBHOOK_VERIFY_TOKEN") < 16) warnings.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN curto (use 16+ caracteres aleatórios)");
  if (has("WHATSAPP_GRAPH_API_VERSION") && !/^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_API_VERSION)) errors.push("WHATSAPP_GRAPH_API_VERSION inválida (ex.: v23.0)");
  if (has("ANTHROPIC_MODEL") && !/^claude-[a-z0-9-]+$/.test(env.ANTHROPIC_MODEL)) errors.push("ANTHROPIC_MODEL inválido");
  if (!has("GOOGLE_PLACES_API_KEY")) warnings.push("GOOGLE_PLACES_API_KEY ausente: descoberta de empresas desativada");
  if (!has("ANTHROPIC_API_KEY")) warnings.push("ANTHROPIC_API_KEY ausente: agentes SDR/Closer desativados");
  if (!waSet.length) warnings.push("WhatsApp não configurado");

  return { errors, warnings };
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const raw = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "development";
  // VERCEL_ENV=preview usa credenciais de desenvolvimento/homologação.
  const target = raw === "preview" ? "development" : raw;
  if (!["production", "development"].includes(target)) {
    console.error("--target deve ser production ou development");
    process.exit(2);
  }
  const { errors, warnings } = checkEnv(process.env, target);
  for (const w of warnings) console.log(`aviso: ${w}`);
  for (const e of errors) console.error(`ERRO: ${e}`);
  console.log(errors.length ? `✖ ${errors.length} erro(s)` : "✔ variáveis de ambiente ok");
  process.exit(errors.length ? 1 : 0);
}
