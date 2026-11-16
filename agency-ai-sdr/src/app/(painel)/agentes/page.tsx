import { deleteKnowledge, saveKnowledge } from "@/actions/ai";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentSimulator } from "./simulator";

export const metadata = { title: "Agentes" };
export const maxDuration = 60;

interface KbRow { id: string; kind: string; title: string; content: string; url: string | null; client_authorized: boolean; authorization_note: string | null; active: boolean; sort_order: number }
const KIND_LABEL: Record<string, string> = { servico: "Serviço", faq: "Pergunta frequente", objecao: "Objeção", condicao: "Condição", limitacao: "Limitação", portfolio: "Portfólio (real e autorizado)" };

export default async function AgentsPage() {
  const profile = await requirePageRole("viewer");
  const isAdmin = hasRole(profile, "admin");
  const supabase = await createSupabaseServerClient();
  const [{ data: s }, { data: kb }] = await Promise.all([
    supabase.from("agent_settings").select("places_enabled, ai_enabled, whatsapp_enabled, whatsapp_test_mode, automation_paused, daily_company_limit").eq("id", 1).maybeSingle(),
    supabase.from("knowledge_base").select("*").order("kind").order("sort_order"),
  ]);

  const scoutReady = Boolean(s?.places_enabled && serverEnv.googlePlacesApiKey);
  const aiReady = Boolean(s?.ai_enabled && s?.whatsapp_enabled && serverEnv.anthropicApiKey);
  const agents = [
    { name: "Scout", role: "Descobre empresas pela Google Places API (New), deduplica e marca “site não identificado” sem tratar como prova.", status: scoutReady ? ["Pronto", "ok"] : ["Aguardando configuração", "warn"], detail: scoutReady ? `Até ${s?.daily_company_limit} empresas novas por dia.` : "Requer GOOGLE_PLACES_API_KEY e habilitação em Configurações." },
    { name: "Analyst", role: "Pontua de 0 a 100 com regras explícitas e salva a justificativa.", status: ["Ativo", "ok"], detail: "Determinístico, sem IA." },
    { name: "SDR", role: "Responde no WhatsApp: entende a necessidade, descobre se há site, explica o serviço, apresenta a proposta e trata objeções com honestidade.", status: aiReady ? ["Respondendo", "ok"] : ["Desligado", "neutral"], detail: `Modelo ${serverEnv.anthropicModel}. Só responde em conversas iniciadas pelo cliente, dentro da janela de 24h e do horário configurado.` },
    { name: "Closer", role: "Assume quando há interesse forte: apresenta a proposta padrão, registra a oportunidade e passa para aprovação humana.", status: aiReady ? ["Respondendo", "ok"] : ["Desligado", "neutral"], detail: "Nunca confirma pagamento, contrato, desconto fora do limite ou reunião." },
  ] as const;

  return (
    <>
      <PageHeader title="Agentes" description="Arquitetura multiagente. As regras comerciais são aplicadas pelo código (travas), não apenas pelo prompt." />
      {s?.automation_paused && <div className="mb-4"><Notice tone="danger">Automações pausadas: nenhum agente executa até um administrador retomar.</Notice></div>}
      {aiReady && s?.whatsapp_test_mode && <div className="mb-4"><Notice tone="info">Modo de teste do WhatsApp ativo: o agente só responde aos números da lista de testes.</Notice></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((a) => (
          <Card key={a.name} title={`Agente ${a.name}`} actions={<Badge tone={a.status[1] as "ok" | "warn" | "neutral"}>{a.status[0]}</Badge>}>
            <p className="text-sm">{a.role}</p>
            <p className="mt-2 text-xs text-muted">{a.detail}</p>
          </Card>
        ))}
      </div>

      <Card title="Travas aplicadas a toda resposta da IA" className="mt-4">
        <ul className="grid list-disc gap-1 pl-5 text-sm text-muted md:grid-cols-2">
          <li>Valores em R$ diferentes da oferta (ou abaixo do desconto máximo) → bloqueia</li>
          <li>Desconto acima do autorizado, ou qualquer desconto se o limite é 0% → bloqueia</li>
          <li>Domínio/hospedagem grátis, manutenção vitalícia, garantia de resultado → bloqueia</li>
          <li>Confirmar pagamento, contrato ou reunião → bloqueia</li>
          <li>Dizer que é atendente/pessoa → bloqueia; 1ª mensagem sempre se identifica como assistente virtual</li>
          <li>Mensagem bloqueada não é enviada: a equipe humana assume com o motivo registrado</li>
          <li>Pedido de humano, intenção de contratar ou de reunião → equipe assume</li>
          <li>Limites: tokens/dia, respostas por conversa/dia, horário de atendimento</li>
        </ul>
      </Card>

      {hasRole(profile, "operator") && (
        <Card title="Simulador do agente" className="mt-4">
          <AgentSimulator />
        </Card>
      )}

      <Card title="Base de conhecimento" className="mt-4">
        <p className="mb-3 text-sm text-muted">Usada pelos agentes SDR e Closer. Preço, condições e prazo vêm da Oferta (Configurações). Portfólio só com projetos reais e autorizados pelo cliente.</p>
        <div className="space-y-3">
          {((kb ?? []) as KbRow[]).map((k) => (
            <details key={k.id} className="rounded-lg border border-line p-3">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{k.title}</span>
                <Badge tone={k.kind === "portfolio" ? "ok" : "neutral"}>{KIND_LABEL[k.kind] ?? k.kind}</Badge>
                {!k.active && <Badge tone="warn">inativo</Badge>}
              </summary>
              {isAdmin ? (
                <div className="mt-3 space-y-2">
                  <ActionForm action={saveKnowledge} submitLabel="Salvar" variant="secondary">
                    <input type="hidden" name="id" value={k.id} />
                    <KbFields k={k} />
                  </ActionForm>
                  <ActionForm action={deleteKnowledge} submitLabel="Excluir" variant="danger">
                    <input type="hidden" name="id" value={k.id} />
                  </ActionForm>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{k.content}</p>
              )}
            </details>
          ))}
        </div>
        {isAdmin && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">Adicionar item</summary>
            <ActionForm action={saveKnowledge} submitLabel="Adicionar" variant="secondary" className="mt-3">
              <KbFields />
            </ActionForm>
          </details>
        )}
      </Card>
    </>
  );
}

function KbFields({ k }: { k?: KbRow }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tipo">
        <select name="kind" defaultValue={k?.kind ?? "faq"}>{Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <Field label="Título"><input name="title" required defaultValue={k?.title} /></Field>
      <div className="sm:col-span-2"><Field label="Conteúdo / orientação"><textarea name="content" rows={4} required defaultValue={k?.content} /></Field></div>
      <Field label="URL (portfólio)"><input name="url" type="url" defaultValue={k?.url ?? ""} /></Field>
      <Field label="Ordem"><input name="sort_order" type="number" defaultValue={k?.sort_order ?? 100} /></Field>
      <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" name="client_authorized" defaultChecked={k?.client_authorized} />Projeto real, autorizado pelo cliente para divulgação</label>
      <Field label="Como a autorização foi obtida (portfólio)"><input name="authorization_note" defaultValue={k?.authorization_note ?? ""} /></Field>
      {k && <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" name="active" defaultChecked={k.active} />Ativo</label>}
    </div>
  );
}
