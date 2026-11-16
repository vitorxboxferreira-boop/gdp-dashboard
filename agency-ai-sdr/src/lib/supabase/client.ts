"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../public-env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente do navegador (somente chave pública; RLS aplica as permissões). */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
  return client;
}
