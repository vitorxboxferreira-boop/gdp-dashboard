import "server-only";
import { z } from "zod";
import { AuthorizationError } from "@/lib/auth";
import type { ActionResult } from "./types";

export function fail(message: string): ActionResult {
  return { ok: false, message };
}
export function ok(message: string): ActionResult {
  return { ok: true, message };
}

/** Converte exceções em mensagens seguras para o usuário (sem vazar detalhes internos). */
export function toResult(err: unknown): ActionResult {
  if (err instanceof AuthorizationError) return fail(err.message);
  if (err instanceof z.ZodError) return fail(err.issues.map((i) => i.message).join("; "));
  const msg = (err as { message?: string })?.message ?? "Erro inesperado";
  console.error("[action]", msg);
  // Mensagens de regras de negócio vindas do banco (RAISE EXCEPTION) são seguras para exibir.
  if (/autoriza|bloqueio|demonstrativ|permission denied|administrador|duplicate key|imutáve|futuro|Anthropic|IA indispon|API de IA/i.test(msg)) {
    if (/duplicate key/i.test(msg)) return fail("Registro duplicado: já existe um cadastro equivalente.");
    if (/permission denied/i.test(msg)) return fail("Você não tem permissão para esta ação.");
    return fail(msg);
  }
  return fail("Não foi possível concluir a operação. Verifique os dados e tente novamente.");
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** "250,00" | "250" | "1.250,50" → centavos */
export function parseBRLToCents(value: string): number | null {
  const clean = value.replace(/[R$\s]/g, "");
  if (!/^\d{1,3}(\.?\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(clean)) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Math.round(Number(normalized) * 100);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** datetime-local (horário de São Paulo, UTC−3) → ISO UTC */
export function spLocalToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(`${value}:00-03:00`).toISOString();
}

export const lines = (v: string) =>
  v.split("\n").map((s) => s.trim()).filter(Boolean);
