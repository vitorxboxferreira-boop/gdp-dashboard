"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, str } from "./helpers";
import type { ActionResult } from "./types";

export async function signIn(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ email: z.string().email("E-mail inválido"), password: z.string().min(8, "Senha inválida") })
    .safeParse({ email: str(fd, "email"), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensagem genérica para não revelar se o e-mail existe.
  if (error) return fail("E-mail ou senha incorretos.");

  const next = str(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
