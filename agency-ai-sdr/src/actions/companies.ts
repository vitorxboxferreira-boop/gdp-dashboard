"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeBrPhone } from "@core/phone.ts";
import { classifyWebsite } from "@core/website.ts";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, optStr, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

const companySchema = z.object({
  name: z.string().min(2, "Informe o nome da empresa").max(200),
  category_label: z.string().max(120).nullable(),
  primary_category: z.string().regex(/^[a-z_]*$/, "Categoria inválida").max(60).nullable(),
  formatted_address: z.string().max(300).nullable(),
  city: z.string().min(2, "Informe a cidade").max(120),
  state: z.string().length(2, "UF com 2 letras").transform((s) => s.toUpperCase()),
  website_uri: z.string().url("URL do site inválida").max(500).nullable(),
  notes: z.string().max(2000).nullable(),
});

export async function createCompany(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let newId: string | null = null;
  try {
    const profile = await requireActionRole("operator");
    const data = companySchema.parse({
      name: str(fd, "name"),
      category_label: optStr(fd, "category_label"),
      primary_category: optStr(fd, "primary_category"),
      formatted_address: optStr(fd, "formatted_address"),
      city: str(fd, "city"),
      state: str(fd, "state"),
      website_uri: optStr(fd, "website_uri"),
      notes: optStr(fd, "notes"),
    });
    const phoneRaw = str(fd, "phone");
    const phone_e164 = phoneRaw ? normalizeBrPhone(phoneRaw) : null;
    if (phoneRaw && !phone_e164) return fail("Telefone inválido. Use DDD + número, ex.: (55) 99999-1234.");

    const supabase = await createSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("companies")
      .insert({
        ...data,
        source: "manual",
        phone_national: phoneRaw || null,
        phone_e164,
        website_status: classifyWebsite(data.website_uri),
        business_status: "OPERATIONAL",
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    newId = row.id;
    revalidatePath("/empresas");
  } catch (e) {
    return toResult(e);
  }
  redirect(`/empresas/${newId}`);
}

const verifySchema = z.object({
  company_id: z.string().uuid(),
  status: z.enum(["verified_none", "verified_exists", "not_identified"]),
  website_uri: z.string().url("URL inválida").nullable(),
});

export async function verifyWebsite(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const v = verifySchema.parse({
      company_id: str(fd, "company_id"),
      status: str(fd, "status"),
      website_uri: optStr(fd, "website_uri"),
    });
    if (v.status === "verified_exists" && !v.website_uri) return fail("Informe a URL do site encontrado.");
    const supabase = await createSupabaseServerClient();
    const patch: Record<string, unknown> = { website_status: v.status };
    if (v.status === "verified_exists") patch.website_uri = v.website_uri;
    if (v.status === "not_identified") Object.assign(patch, { website_verified_at: null, website_verified_by: null });
    const { error } = await supabase.from("companies").update(patch).eq("id", v.company_id);
    if (error) throw error;
    revalidatePath(`/empresas/${v.company_id}`);
    return ok("Verificação de site registrada. A pontuação será recalculada na próxima análise.");
  } catch (e) {
    return toResult(e);
  }
}

export async function updateCompanyNotes(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const id = z.string().uuid().parse(str(fd, "company_id"));
    const notes = z.string().max(2000).parse(str(fd, "notes"));
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("companies").update({ notes: notes || null }).eq("id", id);
    if (error) throw error;
    revalidatePath(`/empresas/${id}`);
    return ok("Observações salvas.");
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteDemoData(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    if (str(fd, "confirm") !== "EXCLUIR DEMO") return fail("Digite EXCLUIR DEMO para confirmar.");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("companies").delete({ count: "exact" }).eq("is_demo", true);
    if (error) throw error;
    revalidatePath("/", "layout");
    return ok(`${count ?? 0} registros demonstrativos excluídos.`);
  } catch (e) {
    return toResult(e);
  }
}
