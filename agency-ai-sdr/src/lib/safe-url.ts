// URLs vindas do banco/usuários: só http(s) viram links (evita "javascript:" e similares).
export function safeExternalHref(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Caminhos internos do painel (ex.: links de notificações). */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\/(?![\\/])[\w\-./?=&%]*$/.test(value) ? value : null;
}

/** Destino após login: apenas caminho interno. */
export function safeNextPath(value: string | null | undefined): string {
  return safeInternalPath(value) ?? "/";
}
