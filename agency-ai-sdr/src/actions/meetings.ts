"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatSlotPtBr } from "@core/scheduling.ts";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAsTeam } from "@/lib/whatsapp-send";
import { bool, fail, ok, spLocalToIso, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

const TZ = "America/Sao_Paulo";

export async function saveMeetingSettings(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("admin");
    const days = fd.getAll("meeting_days").map(Number).filter((d) => d >= 0 && d <= 6);
    if (!days.length) return fail("Selecione ao menos um dia.");
    const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
    const v = z.object({
      meeting_start: z.string().regex(/^\d{2}:\d{2}$/),
      meeting_end: z.string().regex(/^\d{2}:\d{2}$/),
      meeting_duration_min: int(15, 180),
      meeting_buffer_min: int(0, 120),
      meeting_max_per_day: int(1, 20),
      meeting_min_notice_hours: int(0, 168),
      meeting_horizon_days: int(1, 60),
      meeting_location: z.string().min(3).max(300),
    }).parse(Object.fromEntries(fd));
    if (v.meeting_end <= v.meeting_start) return fail("O horário final deve ser depois do inicial.");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("agent_settings").update({ ...v, meeting_days: days, updated_by: profile.id }, { count: "exact" }).eq("id", 1);
    if (error) throw error;
    if (!count) throw new Error("permission denied");
    revalidatePath("/reunioes");
    return ok("Disponibilidade salva.");
  } catch (e) {
    return toResult(e);
  }
}

/** Confirmação humana (o banco exige um usuário, verifica sobreposição e limite diário). */
export async function confirmMeeting(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    const id = z.string().uuid().parse(str(fd, "id"));
    const supabase = await createSupabaseServerClient();
    const { data: appt, error } = await supabase
      .from("appointments")
      .update({ status: "confirmada" })
      .eq("id", id)
      .in("status", ["aguardando_aprovacao", "proposta"])
      .select("id, starts_at, conversation_id, contact_name")
      .maybeSingle();
    if (error) {
      if (/appointments_no_overlap|exclusion/i.test(error.message)) return fail("Conflito: já existe reunião confirmada nesse horário.");
      if (/limite de/i.test(error.message)) return fail(error.message);
      throw error;
    }
    if (!appt) return fail("Reunião não encontrada ou já decidida.");
    revalidatePath("/reunioes");

    if (bool(fd, "notify") && appt.conversation_id) {
      const location = str(fd, "location_note");
      const body = `Olá${appt.contact_name ? `, ${appt.contact_name.split(" ")[0]}` : ""}! Sua reunião está confirmada para ${formatSlotPtBr(new Date(appt.starts_at), TZ)} (horário de Brasília).${location ? ` ${location}` : ""}`;
      const res = await sendAsTeam({ conversationId: appt.conversation_id, userId: profile.id, idempotencyKey: `meeting-confirm:${appt.id}`, kind: "free_text", body });
      return res.ok ? ok("Reunião confirmada e cliente avisado pelo WhatsApp.") : ok(`Reunião confirmada. Aviso não enviado: ${res.message}`);
    }
    return ok("Reunião confirmada.");
  } catch (e) {
    return toResult(e);
  }
}

export async function updateMeetingStatus(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("operator");
    const id = z.string().uuid().parse(str(fd, "id"));
    const status = z.enum(["cancelada", "realizada"]).parse(str(fd, "status"));
    const supabase = await createSupabaseServerClient();
    const patch: Record<string, unknown> = { status };
    if (status === "cancelada") patch.cancelled_reason = str(fd, "reason") || "Cancelada pela equipe";
    const { error } = await supabase.from("appointments").update(patch).eq("id", id);
    if (error) throw error;
    revalidatePath("/reunioes");
    return ok(status === "cancelada" ? "Reunião cancelada." : "Reunião marcada como realizada.");
  } catch (e) {
    return toResult(e);
  }
}

/** Reunião criada pela equipe (ex.: combinada por telefone). */
export async function createMeeting(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActionRole("operator");
    const starts = spLocalToIso(str(fd, "starts_at"));
    if (!starts) return fail("Informe data e hora.");
    const duration = z.coerce.number().int().min(15).max(180).parse(str(fd, "duration") || 30);
    const v = z.object({ contact_name: z.string().min(2, "Nome do contato").max(120), reason: z.string().max(500) })
      .parse({ contact_name: str(fd, "contact_name"), reason: str(fd, "reason") });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("appointments").insert({
      ...v,
      phone_e164: null,
      starts_at: starts,
      ends_at: new Date(new Date(starts).getTime() + duration * 60_000).toISOString(),
      status: "confirmada",
      created_by: profile.id,
    });
    if (error) {
      if (/appointments_no_overlap|exclusion/i.test(error.message)) return fail("Conflito: já existe reunião confirmada nesse horário.");
      if (/limite de|passado/i.test(error.message)) return fail(error.message);
      throw error;
    }
    revalidatePath("/reunioes");
    return ok("Reunião criada e confirmada.");
  } catch (e) {
    return toResult(e);
  }
}
