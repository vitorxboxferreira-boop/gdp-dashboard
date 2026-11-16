import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";
import { publicEnv } from "../public-env";

/**
 * Cliente com privilégio de serviço (ignora RLS). Uso EXCLUSIVO no servidor,
 * depois de verificar o papel do usuário com requireRole().
 */
export function createSupabaseAdminClient() {
  if (!publicEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error("Chave de servidor do Supabase não configurada (SUPABASE_SECRET_KEY).");
  }
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
