"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, parseBRLToCents, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

/** Decisões sobre vendas: somente administradores; o banco valida as transições. */
export async function decideSale(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("admin");
    const id = z.string().uuid().parse(str(fd, "id"));
    const action = z.enum(["aprovar", "rejeitar", "pago", "cancelar"]).parse(str(fd, "action"));
    const supabase = await createSupabaseServerClient();
    const patch: Record<string, unknown> = {};
    if (action === "aprovar") {
      const amount = str(fd, "amount");
      if (amount) {
        const cents = parseBRLToCents(amount);
        if (!cents) return fail("Valor inválido.");
        // Valor ajustado antes da aprovação (negociação humana); registrado na auditoria.
        const { error: e1 } = await supabase.from("sales").update({ amount_cents: cents }).eq("id", id).eq("status", "pendente_aprovacao");
        if (e1) throw e1;
      }
      patch.status = "aprovada";
    } else if (action === "rejeitar") {
      const reason = str(fd, "reason");
      if (reason.length < 3) return fail("Informe o motivo da rejeição.");
      Object.assign(patch, { status: "rejeitada", rejected_reason: reason });
    } else if (action === "pago") {
      if (str(fd, "confirm") !== "on") return fail("Confirme que o pagamento foi verificado no extrato/meio de pagamento.");
      patch.status = "paga";
    } else {
      Object.assign(patch, { status: "cancelada", rejected_reason: str(fd, "reason") || "Cancelada pela equipe" });
    }
    const { data, error } = await supabase.from("sales").update(patch).eq("id", id).select("id").maybeSingle();
    if (error) {
      if (/transição|motivo|valor/i.test(error.message)) return fail(error.message);
      throw error;
    }
    if (!data) return fail("Venda não encontrada.");
    revalidatePath("/vendas");
    revalidatePath("/");
    return ok({ aprovar: "Venda aprovada.", rejeitar: "Venda rejeitada.", pago: "Pagamento confirmado.", cancelar: "Venda cancelada." }[action]);
  } catch (e) {
    return toResult(e);
  }
}

/** Oportunidade registrada manualmente pela equipe (fica pendente de aprovação). */
export async function createSale(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const cents = parseBRLToCents(str(fd, "amount"));
    if (!cents) return fail("Valor inválido.");
    const companyId = str(fd, "company_id") || null;
    const v = z.object({ description: z.string().min(3).max(300), company_id: z.string().uuid().nullable() })
      .parse({ description: str(fd, "description"), company_id: companyId });
    const supabase = await createSupabaseServerClient();
    let leadId: string | null = null;
    if (v.company_id) {
      const { data: lead } = await supabase.from("leads").select("id").eq("company_id", v.company_id).maybeSingle();
      leadId = lead?.id ?? null;
    }
    const { error } = await supabase.from("sales").insert({ ...v, lead_id: leadId, amount_cents: cents, status: "pendente_aprovacao", notes: str(fd, "notes") || null });
    if (error) throw error;
    revalidatePath("/vendas");
    return ok("Oportunidade registrada (aguardando aprovação).");
  } catch (e) {
    return toResult(e);
  }
}
