// Agente ANALYST — pontuação comercial determinística (0–100) com justificativa.
// Regras explícitas e auditáveis: nenhuma informação é inventada; a ausência de
// dados reduz a pontuação ou leva a "verificar", nunca é preenchida por suposição.

import { isBrMobile } from "./phone.ts";
import type { WebsiteStatus } from "./website.ts";

export const SCORE_VERSION = "analyst-v1";

export type LeadPriority = "alta" | "media" | "baixa" | "verificar";

export interface ScoringInput {
  website_status: WebsiteStatus;
  website_uri?: string | null;
  primary_category: string | null;
  types?: string[] | null;
  phone_e164: string | null;
  formatted_address: string | null;
  business_status: string | null;
  rating: number | null;
  user_rating_count: number | null;
}

export interface ScoringConfig {
  categoryWeights: Record<string, number>;
  thresholds: { alta: number; media: number };
}

export interface ScoreReason {
  criterion:
    | "site"
    | "presenca_digital"
    | "informacoes"
    | "categoria"
    | "potencial"
    | "contato"
    | "status";
  points: number;
  detail: string;
}

export interface ScoreResult {
  score: number;
  priority: LeadPriority;
  reasons: ScoreReason[];
  needsVerification: string[];
  version: string;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  categoryWeights: { _default: 8 },
  thresholds: { alta: 70, media: 45 },
};

function categoryPoints(input: ScoringInput, weights: Record<string, number>): { points: number; key: string | null } {
  const candidates = [input.primary_category, ...(input.types ?? [])].filter(Boolean) as string[];
  let best: { points: number; key: string | null } = { points: weights._default ?? 8, key: null };
  let matched = false;
  for (const key of candidates) {
    const w = weights[key];
    if (typeof w === "number" && (!matched || w > best.points)) {
      best = { points: w, key };
      matched = true;
    }
  }
  return { points: Math.max(0, Math.min(15, best.points)), key: best.key };
}

export function scoreCompany(input: ScoringInput, config: ScoringConfig = DEFAULT_SCORING_CONFIG): ScoreResult {
  const reasons: ScoreReason[] = [];
  const needsVerification: string[] = [];

  // 1) Status do negócio — empresas fechadas não são prospectáveis.
  if (input.business_status === "CLOSED_PERMANENTLY") {
    return {
      score: 0,
      priority: "baixa",
      reasons: [{ criterion: "status", points: 0, detail: "Fonte indica que a empresa está permanentemente fechada" }],
      needsVerification: [],
      version: SCORE_VERSION,
    };
  }

  // 2) Site (até 40 pts)
  switch (input.website_status) {
    case "verified_none":
      reasons.push({ criterion: "site", points: 40, detail: "Verificado manualmente: não possui site" });
      break;
    case "social_only":
      reasons.push({ criterion: "site", points: 32, detail: "Presença apenas em redes sociais/plataformas de terceiros" });
      break;
    case "not_identified":
      reasons.push({ criterion: "site", points: 30, detail: "Site não identificado na fonte (requer verificação, não é prova de ausência)" });
      needsVerification.push("Confirmar se a empresa possui site");
      break;
    case "identified":
      reasons.push({ criterion: "site", points: 0, detail: "Fonte informa site próprio" });
      break;
    case "verified_exists":
      reasons.push({ criterion: "site", points: 0, detail: "Verificado manualmente: possui site" });
      break;
  }

  // 3) Presença digital / atividade (até 15 pts) — avaliações indicam negócio ativo e com clientes.
  const reviews = input.user_rating_count ?? 0;
  let presence = 0;
  let presenceDetail = "Sem avaliações públicas na fonte";
  if (reviews >= 50) {
    presence = 15;
    presenceDetail = `${reviews} avaliações públicas: negócio ativo com demanda`;
  } else if (reviews >= 10) {
    presence = 10;
    presenceDetail = `${reviews} avaliações públicas`;
  } else if (reviews > 0) {
    presence = 5;
    presenceDetail = `Poucas avaliações públicas (${reviews})`;
  }
  if (input.rating != null && input.rating >= 4.5 && reviews >= 10) {
    presence = Math.min(15, presence + 3);
    presenceDetail += `, nota ${input.rating.toFixed(1)}`;
  }
  reasons.push({ criterion: "presenca_digital", points: presence, detail: presenceDetail });

  // 4) Informações disponíveis (até 10 pts)
  let info = 0;
  const infoParts: string[] = [];
  if (input.formatted_address) {
    info += 5;
    infoParts.push("endereço");
  }
  if (input.phone_e164) {
    info += 5;
    infoParts.push("telefone");
  }
  reasons.push({
    criterion: "informacoes",
    points: info,
    detail: infoParts.length ? `Informações disponíveis: ${infoParts.join(", ")}` : "Poucas informações disponíveis",
  });

  // 5) Categoria / potencial de contratação (até 15 pts)
  const cat = categoryPoints(input, config.categoryWeights);
  reasons.push({
    criterion: "categoria",
    points: cat.points,
    detail: cat.key
      ? `Categoria "${cat.key}" com peso ${cat.points} para sites locais`
      : `Categoria sem peso específico (padrão ${cat.points})`,
  });

  // 6) Facilidade de contato (até 10 pts) — celular não implica WhatsApp nem autorização.
  let contact = 0;
  let contactDetail = "Sem telefone válido";
  if (isBrMobile(input.phone_e164)) {
    contact = 10;
    contactDetail = "Telefone celular disponível (contato por WhatsApp ainda exige autorização)";
  } else if (input.phone_e164) {
    contact = 6;
    contactDetail = "Telefone fixo disponível";
  } else {
    needsVerification.push("Obter telefone de contato válido");
  }
  reasons.push({ criterion: "contato", points: contact, detail: contactDetail });

  // 7) Potencial de contratação (até 10 pts): negócio ativo sem site próprio conhecido.
  const noOwnSite = input.website_status !== "identified" && input.website_status !== "verified_exists";
  if (noOwnSite && reviews >= 10) {
    reasons.push({ criterion: "potencial", points: 10, detail: "Negócio ativo sem site próprio conhecido: alto potencial" });
  } else if (noOwnSite) {
    reasons.push({ criterion: "potencial", points: 4, detail: "Sem site próprio conhecido, atividade pouco evidente" });
  } else {
    reasons.push({ criterion: "potencial", points: 0, detail: "Já possui site próprio: potencial baixo para o pacote inicial" });
  }

  // 8) Status operacional desconhecido/temporariamente fechado
  if (input.business_status && input.business_status !== "OPERATIONAL") {
    needsVerification.push(`Status na fonte: ${input.business_status}`);
    reasons.push({ criterion: "status", points: -10, detail: `Status na fonte: ${input.business_status}` });
  }

  const raw = reasons.reduce((sum, r) => sum + r.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let priority: LeadPriority;
  const blocking = !input.phone_e164 || (input.business_status != null && input.business_status !== "OPERATIONAL");
  if (blocking && noOwnSite) {
    priority = "verificar";
  } else if (!noOwnSite) {
    priority = "baixa"; // o produto é voltado a empresas sem site próprio
  } else if (score >= config.thresholds.alta) {
    priority = "alta";
  } else if (score >= config.thresholds.media) {
    priority = "media";
  } else {
    priority = "baixa";
  }

  return { score, priority, reasons, needsVerification, version: SCORE_VERSION };
}

export function scoringConfigFromSettings(settings: {
  category_weights?: Record<string, number> | null;
  scoring_thresholds?: { alta?: number; media?: number } | null;
}): ScoringConfig {
  return {
    categoryWeights: { ...DEFAULT_SCORING_CONFIG.categoryWeights, ...(settings.category_weights ?? {}) },
    thresholds: {
      alta: settings.scoring_thresholds?.alta ?? DEFAULT_SCORING_CONFIG.thresholds.alta,
      media: settings.scoring_thresholds?.media ?? DEFAULT_SCORING_CONFIG.thresholds.media,
    },
  };
}
