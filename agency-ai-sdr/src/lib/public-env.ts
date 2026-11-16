// Variáveis públicas (expostas ao navegador). NUNCA coloque chaves privadas aqui.
// Valores colados pelo celular costumam vir com espaço/quebra de linha invisível:
// limpamos aqui para não quebrar a autenticação.

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * URL: somente a origem (https://xxxx.supabase.co). Remove espaços e caminhos colados
 * por engano, como "/rest/v1/" exibido em algumas telas do Supabase.
 */
export function cleanUrl(v: string): string {
  const t = v.trim();
  try {
    const u = new URL(t);
    return u.origin;
  } catch {
    return t.replace(/\/+$/, "");
  }
}

/** Chaves nunca contêm espaços: remove qualquer espaço/quebra de linha e aspas coladas por engano. */
export function cleanKey(v: string): string {
  return v.replace(/\s+/g, "").replace(/^["']|["']$/g, "");
}

export const publicEnv = {
  supabaseUrl: cleanUrl(rawUrl),
  supabasePublishableKey: cleanKey(rawKey),
};

/** Indica se os valores originais precisaram de limpeza (diagnóstico). */
export const publicEnvHadWhitespace = rawUrl !== publicEnv.supabaseUrl || rawKey !== publicEnv.supabasePublishableKey;

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabasePublishableKey);
