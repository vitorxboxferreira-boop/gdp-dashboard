"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bool, fail, lines, ok, parseBRLToCents, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

const int = (min: number, max: number, label: string) =>
  z.coerce.number({ message: `${label}: número inválido` }).int(`${label}: use número inteiro`).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`);
const money = (label: string) => z.coerce.number({ message: `${label}: valor inválido` }).min(0).max(1000);

async function updateSettings(patch: Record<string, unknown>, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("agent_settings")
    .update({ ...patch, updated_by: userId }, { count: "exact" })
    .eq("id", 1);
  if (error) throw error;
  if (count === 0) throw new Error("permission denied");
  revalidatePath("/", "layout");
}

export async function saveLimits(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const v = z
      .object({
        daily_company_limit: int(1, 500, "Empresas por dia"),
        places_daily_request_limit: int(0, 1000, "Requisições Places por dia"),
        ai_daily_token_limit: int(0, 50_000_000, "Tokens de IA por dia"),
        whatsapp_daily_message_limit: int(0, 10_000, "Mensagens WhatsApp por dia"),
        places_cost_per_request_usd: money("Custo Places"),
        ai_cost_per_mtok_input_usd: money("Custo IA entrada"),
        ai_cost_per_mtok_output_usd: money("Custo IA saída"),
        whatsapp_cost_per_message_usd: money("Custo WhatsApp"),
        data_retention_days: int(30, 3650, "Retenção"),
        places_content_ttl_days: int(1, 365, "Validade dos dados do Places"),
      })
      .parse(Object.fromEntries(fd));
    await updateSettings(v, profile.id);
    return ok("Limites e estimativas salvos.");
  } catch (e) {
    return toResult(e);
  }
}

export async function saveAutomationFlags(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const placesEnabled = bool(fd, "places_enabled");
    const autopilot = bool(fd, "autopilot_enabled");
    if (placesEnabled && !bool(fd, "places_cost_ack")) {
      return fail("Para habilitar o Google Places, confirme que está ciente do custo estimado por requisição e do limite diário.");
    }
    if (bool(fd, "ai_enabled") || bool(fd, "whatsapp_enabled")) {
      return fail("IA e WhatsApp só podem ser habilitados após a conclusão e validação das Fases 2 e 3.");
    }
    await updateSettings(
      {
        places_enabled: placesEnabled,
        autopilot_enabled: autopilot,
        run_on_weekends: bool(fd, "run_on_weekends"),
        run_on_holidays: bool(fd, "run_on_holidays"),
      },
      profile.id,
    );
    return ok("Configurações de automação salvas.");
  } catch (e) {
    return toResult(e);
  }
}

export async function saveOffer(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const price = parseBRLToCents(str(fd, "price"));
    if (!price) return fail("Preço inválido. Ex.: 250,00");
    const offer = z
      .object({
        product_name: z.string().min(3).max(200),
        price_cents: z.number().int().positive(),
        currency: z.literal("BRL"),
        includes: z.array(z.string().max(200)).min(1, "Liste ao menos um item incluído"),
        not_included: z.array(z.string().max(300)),
        max_discount_percent: z.coerce.number().min(0).max(50),
        payment_terms: z.string().max(1000),
        delivery_time: z.string().max(300),
      })
      .parse({
        product_name: str(fd, "product_name"),
        price_cents: price,
        currency: "BRL",
        includes: lines(str(fd, "includes")),
        not_included: lines(str(fd, "not_included")),
        max_discount_percent: str(fd, "max_discount_percent") || 0,
        payment_terms: str(fd, "payment_terms"),
        delivery_time: str(fd, "delivery_time"),
      });
    await updateSettings({ offer }, profile.id);
    return ok("Oferta comercial salva.");
  } catch (e) {
    return toResult(e);
  }
}

export async function saveScoring(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    let weights: unknown;
    try {
      weights = JSON.parse(str(fd, "category_weights"));
    } catch {
      return fail("Pesos de categoria: JSON inválido.");
    }
    const parsedWeights = z.record(z.string().regex(/^[a-z_]+$/), z.number().int().min(0).max(15)).parse(weights);
    const alta = int(1, 100, "Limite alta").parse(str(fd, "alta"));
    const media = int(0, 99, "Limite média").parse(str(fd, "media"));
    if (media >= alta) return fail("O limite de média prioridade deve ser menor que o de alta.");
    await updateSettings({ category_weights: parsedWeights, scoring_thresholds: { alta, media } }, profile.id);
    return ok("Critérios de pontuação salvos. Use “Reanalisar” para aplicar às empresas existentes.");
  } catch (e) {
    return toResult(e);
  }
}

export async function addSearchArea(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const v = z
      .object({
        city: z.string().min(2).max(120),
        state: z.string().length(2).transform((s) => s.toUpperCase()),
        latitude: z.coerce.number().min(-90).max(90).nullable(),
        longitude: z.coerce.number().min(-180).max(180).nullable(),
        radius_m: int(500, 50000, "Raio"),
        priority: int(1, 1000, "Prioridade"),
        categories: z.array(z.string().min(2).max(80)).min(1, "Informe ao menos uma categoria"),
      })
      .parse({
        city: str(fd, "city"),
        state: str(fd, "state"),
        latitude: str(fd, "latitude") || null,
        longitude: str(fd, "longitude") || null,
        radius_m: str(fd, "radius_m") || 8000,
        priority: str(fd, "priority") || 100,
        categories: lines(str(fd, "categories")),
      });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("search_areas")
      .insert({ ...v, name: `${v.city} — ${v.state}`, created_by: profile.id });
    if (error) throw error;
    revalidatePath("/configuracoes");
    return ok("Área de busca adicionada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function updateSearchArea(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const id = z.string().uuid().parse(str(fd, "id"));
    const categories = lines(str(fd, "categories"));
    if (!categories.length) return fail("Informe ao menos uma categoria.");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("search_areas")
      .update({ active: bool(fd, "active"), categories, category_cursor: 0 })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return ok("Área atualizada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function addHoliday(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const v = z
      .object({
        holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
        name: z.string().min(2).max(120),
        scope: z.enum(["nacional", "estadual", "municipal", "empresa"]),
      })
      .parse({ holiday_date: str(fd, "holiday_date"), name: str(fd, "name"), scope: str(fd, "scope") || "municipal" });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("holidays").upsert(v);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return ok("Feriado salvo.");
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteHoliday(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(str(fd, "holiday_date"));
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("holidays").delete().eq("holiday_date", date);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return ok("Feriado removido.");
  } catch (e) {
    return toResult(e);
  }
}

export async function setUserRole(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const v = z
      .object({ email: z.string().email("E-mail inválido"), role: z.enum(["pending", "viewer", "operator", "admin"]) })
      .parse({ email: str(fd, "email"), role: str(fd, "role") });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("grant_role", { p_email: v.email, p_role: v.role });
    if (error) throw error;
    revalidatePath("/configuracoes");
    return ok(`Papel de ${v.email} atualizado.`);
  } catch (e) {
    return toResult(e);
  }
}
