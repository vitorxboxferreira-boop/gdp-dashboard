"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/safe-url";
import { fail, str } from "./helpers";
import type { ActionResult } from "./types";

export async function signIn(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ email: z.string().email("E-mail inválido"), password: z.string().min(8, "Senha inválida") })
    .safeParse({ email: str(fd, "email"), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Registra a causa (sem senha nem e-mail) para diagnóstico nos logs da Vercel.
    console.error(JSON.stringify({ msg: "auth.login.failed", code: error.code ?? null, status: error.status ?? null, name: error.name, detail: error.message }));
    // Credenciais inválidas continuam com mensagem genérica (não revela se o e-mail existe).
    return fail(loginErrorMessage(error));
  }

  redirect(safeNextPath(str(fd, "next")));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
