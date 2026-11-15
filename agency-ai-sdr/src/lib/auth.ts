import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";
import type { Profile, Role } from "./types";

const LEVEL: Record<Role, number> = { pending: 0, viewer: 1, operator: 2, admin: 3 };

export const hasRole = (profile: Pick<Profile, "role"> | null, min: Role) =>
  Boolean(profile && LEVEL[profile.role] >= LEVEL[min]);

/** Usuário autenticado + perfil (memoizado por requisição). */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", sub)
    .maybeSingle();
  return (profile as Profile | null) ?? null;
});

/** Para páginas: redireciona se não autenticado/sem papel suficiente. */
export async function requirePageRole(min: Role = "viewer"): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasRole(profile, min)) redirect("/sem-acesso");
  return profile;
}

export class AuthorizationError extends Error {}

/** Para server actions: lança erro se o papel for insuficiente. */
export async function requireActionRole(min: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new AuthorizationError("Sessão expirada. Entre novamente.");
  if (!hasRole(profile, min)) throw new AuthorizationError("Você não tem permissão para esta ação.");
  return profile;
}
