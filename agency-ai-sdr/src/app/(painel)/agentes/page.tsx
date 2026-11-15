import { Badge, Card, PageHeader } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Agentes" };

export default async function AgentsPage() {
  await requirePageRole("viewer");
  const supabase = await createSupabaseServerClient();
  const { data: s } = await supabase.from("agent_settings").select("places_enabled, ai_enabled, whatsapp_enabled, automation_paused, daily_company_limit").eq("id", 1).maybeSingle();

  const scoutReady = Boolean(s?.places_enabled && serverEnv.googlePlacesApiKey);
  const agents = [
    {
      name: "Scout",
      role: "Descobre empresas pela Google Places API (New), deduplica por Place ID e telefone e marca “site não identificado” sem tratar isso como prova.",
      status: scoutReady ? ["Pronto", "ok"] : ["Aguardando configuração", "warn"],
      detail: scoutReady ? `Até ${s?.daily_company_limit} empresas novas por dia.` : "Requer GOOGLE_PLACES_API_KEY e habilitação explícita em Configurações.",
      phase: 1,
    },
    {
      name: "Analyst",
      role: "Pontua de 0 a 100 com regras explícitas (site, presença digital, informações, categoria, potencial e contato) e salva a justificativa.",
      status: ["Ativo", "ok"],
      detail: "Determinístico, sem IA: não inventa informações.",
      phase: 1,
    },
    {
      name: "SDR",
      role: "Atende pelo WhatsApp Cloud API oficial, apresenta o serviço, descobre necessidades e responde dúvidas — somente com contatos autorizados.",
      status: ["Não implementado", "neutral"],
      detail: "Fases 2 (WhatsApp) e 3 (IA).",
      phase: 3,
    },
    {
      name: "Closer",
      role: "Identifica intenção de compra, apresenta a proposta padrão dentro dos limites configurados e solicita aprovação humana.",
      status: ["Não implementado", "neutral"],
      detail: "Fases 3 e 4. Nunca confirma pagamento, contrato ou compromisso sem aprovação.",
      phase: 3,
    },
  ] as const;

  return (
    <>
      <PageHeader title="Agentes" description="Arquitetura multiagente. Agentes de conversa só serão ativados após validação das integrações e mecanismos de segurança." />
      {s?.automation_paused && <p className="mb-4 text-sm text-danger">Automações pausadas: nenhum agente executa até um administrador retomar.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((a) => (
          <Card key={a.name} title={`Agente ${a.name}`} actions={<Badge tone={a.status[1] as "ok" | "warn" | "neutral"}>{a.status[0]}</Badge>}>
            <p className="text-sm">{a.role}</p>
            <p className="mt-2 text-xs text-muted">{a.detail} · Fase {a.phase}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
