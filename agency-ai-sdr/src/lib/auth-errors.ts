// Traduz erros do Supabase Auth em mensagens úteis sem revelar se um e-mail existe.
export interface AuthErrorLike {
  code?: string | null;
  status?: number | null;
  message?: string | null;
  name?: string | null;
}

export function loginErrorMessage(err: AuthErrorLike): string {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "E-mail ainda não confirmado. No Supabase, confirme o usuário (Authentication → Users) ou recrie com “Auto Confirm User”.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || err.status === 429) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (msg.includes("invalid api key") || code === "bad_jwt" || code === "no_authorization" || err.status === 401 || err.status === 403) {
    return "Configuração do Supabase inválida: verifique NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel (deve ser a chave publishable/anon do MESMO projeto) e faça Redeploy.";
  }
  if (err.name === "AuthRetryableFetchError" || err.status === 0 || msg.includes("fetch failed") || msg.includes("failed to fetch")) {
    return "Não foi possível conectar ao Supabase: verifique NEXT_PUBLIC_SUPABASE_URL na Vercel e faça Redeploy.";
  }
  return `Não foi possível entrar (código: ${code || err.status || "desconhecido"}). Tente novamente ou verifique a configuração do Supabase.`;
}
