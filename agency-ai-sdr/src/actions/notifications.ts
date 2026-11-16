"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ok, str, toResult } from "./helpers";
import type { ActionResult } from "./types";

export async function markNotificationsRead(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireActionRole("viewer");
    const id = str(fd, "id");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("mark_notifications_read", { p_ids: id ? [z.coerce.number().int().parse(id)] : null });
    if (error) throw error;
    revalidatePath("/", "layout");
    return ok(`${data ?? 0} marcada(s) como lida(s).`);
  } catch (e) {
    return toResult(e);
  }
}
