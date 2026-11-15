// Normalização de telefones brasileiros para E.164 (+55DDDNUMERO).
// Código puro, sem dependências: roda em Node (Next.js/Vitest) e Deno (Edge Functions).

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Converte um telefone brasileiro em formato livre para E.164.
 * Retorna null quando não é possível garantir um número válido
 * (nunca "adivinha" dígitos ausentes).
 */
export function normalizeBrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  const hadPlus = trimmed.startsWith("+");
  if (hadPlus) {
    if (!digits.startsWith("55")) return null; // somente números brasileiros
    digits = digits.slice(2);
  } else {
    // Remove prefixos de discagem: 0 + código de operadora (ex.: 0 21 55 ...), ou 0 isolado.
    if (digits.length >= 12 && digits.startsWith("55") && !digits.startsWith("0")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      digits = digits.replace(/^0+/, "");
      if (digits.length === 12 || digits.length === 13) {
        digits = digits.slice(2); // código de operadora
      }
    }
  }

  if (digits.length !== 10 && digits.length !== 11) return null;
  const ddd = Number(digits.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) return null;
  const subscriber = digits.slice(2);
  if (subscriber.length === 9 && !subscriber.startsWith("9")) return null;
  if (subscriber.length === 8 && !/^[2-5]/.test(subscriber)) return null; // fixos começam com 2–5
  return `+55${digits}`;
}

/** Celular brasileiro: 9 dígitos após o DDD começando com 9. Não implica WhatsApp. */
export function isBrMobile(e164: string | null | undefined): boolean {
  if (!e164) return false;
  return /^\+55\d{2}9\d{8}$/.test(e164);
}

/** Formatação amigável para exibição: +55 (55) 99999-9999 */
export function formatBrPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}
