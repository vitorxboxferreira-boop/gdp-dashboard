// Classificação do site retornado pela fonte (Google Places).
// Ausência de websiteUri NÃO prova que a empresa não tem site: retorna "not_identified".

export type WebsiteStatus =
  | "not_identified"
  | "identified"
  | "social_only"
  | "verified_none"
  | "verified_exists";

/** Domínios de redes sociais, encurtadores e plataformas de terceiros que não são um site próprio. */
const THIRD_PARTY_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "m.facebook.com",
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "linktr.ee",
  "linktree.com",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "ifood.com.br",
  "beacons.ai",
  "bio.link",
  "taplink.cc",
  "goo.gl",
  "maps.app.goo.gl",
  "g.page",
  "business.site", // Perfil de Empresa do Google (sites antigos, descontinuados)
];

export function hostOf(uri: string): string | null {
  try {
    const url = new URL(uri.includes("://") ? uri : `https://${uri}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isThirdPartyHost(host: string): boolean {
  return THIRD_PARTY_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

export function classifyWebsite(uri: string | null | undefined): WebsiteStatus {
  if (!uri || !uri.trim()) return "not_identified";
  const host = hostOf(uri.trim());
  if (!host) return "not_identified";
  return isThirdPartyHost(host) ? "social_only" : "identified";
}

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  not_identified: "Site não identificado",
  identified: "Site identificado",
  social_only: "Só redes sociais",
  verified_none: "Verificado: sem site",
  verified_exists: "Verificado: possui site",
};

/** Considera-se oportunidade de venda quando não há site próprio conhecido. */
export function lacksOwnWebsite(status: WebsiteStatus): boolean {
  return status === "not_identified" || status === "social_only" || status === "verified_none";
}
