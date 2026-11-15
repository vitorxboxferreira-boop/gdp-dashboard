import type { WebsiteStatus } from "@core/website.ts";
import { CONTACT_LABELS, PRIORITY_LABELS, STAGE_LABELS, websiteLabel } from "@/lib/format";
import type { ContactStatus, LeadPriority, LeadStage } from "@/lib/types";
import { Badge } from "./ui";

export function PriorityBadge({ priority }: { priority: LeadPriority | null }) {
  if (!priority) return <Badge>Sem pontuação</Badge>;
  const tone = priority === "alta" ? "ok" : priority === "media" ? "info" : priority === "verificar" ? "warn" : "neutral";
  return <Badge tone={tone}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function WebsiteBadge({ status }: { status: WebsiteStatus }) {
  const tone = status === "identified" || status === "verified_exists" ? "neutral" : status === "not_identified" ? "warn" : "ok";
  return <Badge tone={tone}>{websiteLabel(status)}</Badge>;
}

export function ContactBadge({ status }: { status: ContactStatus }) {
  const tone = status === "elegivel" ? "ok" : status === "bloqueado" ? "danger" : status === "demo" ? "info" : "neutral";
  return <Badge tone={tone}>{CONTACT_LABELS[status]}</Badge>;
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  return <Badge>{STAGE_LABELS[stage]}</Badge>;
}

export function DemoBadge() {
  return <Badge tone="info">FICTÍCIO</Badge>;
}
