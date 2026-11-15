import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicLlm } from "@core/anthropic-llm.ts";
import type { PipelineDeps } from "@core/pipeline.ts";
import { SupabaseRepo } from "@core/supabase-repo.ts";
import { serverEnv, whatsappSendConfigured } from "./env";
import { createSupabaseAdminClient } from "./supabase/admin";

/** Dependências dos agentes no servidor (chaves privadas nunca chegam ao navegador). */
export function buildAgentDeps(): PipelineDeps & { repo: SupabaseRepo } {
  const repo = new SupabaseRepo(createSupabaseAdminClient());
  return {
    repo,
    placesApiKey: serverEnv.googlePlacesApiKey,
    llm: serverEnv.anthropicApiKey
      ? createAnthropicLlm({ client: new Anthropic({ apiKey: serverEnv.anthropicApiKey, maxRetries: 2, timeout: 60_000 }), model: serverEnv.anthropicModel })
      : null,
    whatsapp: whatsappSendConfigured()
      ? { accessToken: serverEnv.whatsappAccessToken!, phoneNumberId: serverEnv.whatsappPhoneNumberId!, graphVersion: serverEnv.whatsappGraphVersion }
      : null,
    log: (msg, data) => console.log(JSON.stringify({ msg, ...data })),
  };
}
