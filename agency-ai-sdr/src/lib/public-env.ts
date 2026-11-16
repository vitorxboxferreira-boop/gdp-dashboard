// Variáveis públicas (expostas ao navegador). NUNCA coloque chaves privadas aqui.
// Valores colados pelo celular costumam vir com espaço/quebra de linha invisível:
// limpamos aqui para não quebrar a autenticação.

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** URL: sem espaços nas pontas e sem "/" no final. */
export function cleanUrl(v: string): string {
  return v.trim().replace(/\/+$/, "");
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
