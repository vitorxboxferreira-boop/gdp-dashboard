import { formatBrPhone } from "@core/phone.ts";
import { saveAiSettings } from "@/actions/ai";
import { saveTemplate } from "@/actions/templates";
import { resumeAutomation } from "@/actions/automation";
import { deleteDemoData } from "@/actions/companies";
import { removeSuppression, suppressPhone } from "@/actions/consents";
import {
  addHoliday, addSearchArea, deleteHoliday, saveAutomationFlags, saveLimits, saveOffer, saveScoring, saveWhatsAppSettings, setUserRole, updateSearchArea,
} from "@/actions/settings";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { headers } from "next/headers";
import { integrationStatuses, serverEnv, whatsappSendConfigured, whatsappWebhookConfigured } from "@/lib/env";
import { fmtDate, fmtDateTime, fmtUSD, ROLE_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, SettingsRow } from "@/lib/types";

export const metadata = { title: "Configurações" };

interface Area { id: string; name: string; city: string; state: string; radius_m: number; categories: string[]; active: boolean; priority: number; category_cursor: number }

export default async function SettingsPage() {
  const profile = await requirePageRole("viewer");
  const isAdmin = hasRole(profile, "admin");
  const canOperate = hasRole(profile, "operator");
  const supabase = await createSupabaseServerClient();
  const [{ data: sData }, { data: areas }, { data: holidays }, { data: users }, { data: suppression }, { count: demoCount }, { data: templates }] = await Promise.all([
    supabase.from("agent_settings").select("*").eq("id", 1).single(),
    supabase.from("search_areas").select("*").order("priority"),
    supabase.from("holidays").select("*").gte("holiday_date", new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())).order("holiday_date").limit(20),
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
    supabase.from("suppression_list").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_demo", true),
    supabase.from("whatsapp_templates").select("*").order("name"),
  ]);
  const s = sData as SettingsRow;
  const integrations = integrationStatuses();
  const ro = !isAdmin;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "seu-dominio"}`;

  return (
    <>
      <PageHeader title="Configurações" description={isAdmin ? "Alterações são registradas na auditoria." : "Somente administradores podem alterar configurações."} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Integrações" className="xl:col-span-2">
          <Table>
            <thead><tr><Th>Integração</Th><Th>Fase</Th><Th>Situação</Th><Th>Detalhe</Th></tr></thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.key}>
                  <Td className="font-medium">{i.label}</Td>
                  <Td>{i.phase}</Td>
                  <Td>{i.configured ? <Badge tone="ok">Credencial presente</Badge> : <Badge tone={i.phase === 1 ? "warn" : "neutral"}>Não configurada</Badge>}</Td>
                  <Td className="text-xs text-muted">{i.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-3 text-xs text-muted">
            “Credencial presente” não significa integração validada. Nenhuma integração externa foi testada contra a API real nesta entrega.
            Chaves privadas ficam apenas em variáveis de ambiente do servidor/Edge Functions, nunca no navegador.
          </p>
        </Card>

        {s.automation_paused && (
          <Card title="Retomar automações" className="xl:col-span-2">
            <p className="mb-3 text-sm text-danger">Pausadas em {fmtDateTime(s.paused_at)}: {s.paused_reason}</p>
            {isAdmin ? (
              <ActionForm action={resumeAutomation} submitLabel="Retomar automações" variant="danger">
                <Field label='Digite "RETOMAR" para confirmar'><input name="confirm" required autoComplete="off" /></Field>
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">Somente administradores podem retomar.</p>
            )}
          </Card>
        )}

        <Card title="Automação">
          <ActionForm action={saveAutomationFlags} submitLabel="Salvar" variant="secondary">
            <fieldset disabled={ro} className="space-y-3 text-sm">
              <Check name="places_enabled" checked={s.places_enabled} label="Habilitar Google Places API (serviço pago)" />
              <label className="ml-6 flex items-start gap-2 text-xs text-fg">
                <input type="checkbox" name="places_cost_ack" defaultChecked={s.places_enabled} className="mt-0.5" />
                Estou ciente do custo estimado de {fmtUSD(s.places_cost_per_request_usd)} por requisição, até {s.places_daily_request_limit} requisições/dia
                (máx. {fmtUSD(s.places_cost_per_request_usd * s.places_daily_request_limit)}/dia).
              </label>
              <Check name="autopilot_enabled" checked={s.autopilot_enabled} label="Piloto automático (campanha diária às 08:00, seg–sex)" />
              <Check name="run_on_weekends" checked={s.run_on_weekends} label="Executar também aos fins de semana" />
              <Check name="run_on_holidays" checked={s.run_on_holidays} label="Executar também em feriados" />
            </fieldset>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">O piloto automático só executa depois que o agendamento for ativado (supabase/sql/activate_cron.sql).</p>
        </Card>

        <Card title="WhatsApp (Cloud API oficial)" className="xl:col-span-2">
          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted">URL do webhook: </span><code className="break-all">{origin}/api/webhooks/whatsapp</code></div>
            <div><span className="text-muted">Campo assinado: </span><code>messages</code> · <span className="text-muted">Graph API: </span><code>{serverEnv.whatsappGraphVersion}</code></div>
            <div><span className="text-muted">Recebimento: </span>{whatsappWebhookConfigured() ? <Badge tone="ok">credenciais presentes</Badge> : <Badge tone="warn">falta WHATSAPP_APP_SECRET / VERIFY_TOKEN</Badge>}</div>
            <div><span className="text-muted">Envio: </span>{whatsappSendConfigured() ? <Badge tone="ok">credenciais presentes</Badge> : <Badge tone="warn">falta ACCESS_TOKEN / PHONE_NUMBER_ID</Badge>}</div>
          </div>
          <ActionForm action={saveWhatsAppSettings} submitLabel="Salvar WhatsApp" variant="secondary">
            <fieldset disabled={ro} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Check name="whatsapp_enabled" checked={s.whatsapp_enabled} label="Habilitar WhatsApp (envio manual pela equipe)" />
                <label className="ml-6 flex items-start gap-2 text-xs text-fg">
                  <input type="checkbox" name="whatsapp_ack" defaultChecked={s.whatsapp_enabled} className="mt-0.5" />
                  Conheço as políticas do WhatsApp Business: texto livre só dentro da janela de 24h; mensagens iniciadas pela empresa só com autorização registrada e template aprovado.
                </label>
                <Check name="whatsapp_test_mode" checked={s.whatsapp_test_mode} label="Modo de teste: enviar SOMENTE para os números abaixo" />
                <Field label="Números de teste (um por linha)" hint="Ex.: o número pessoal usado para validar com o número de teste da Meta">
                  <textarea name="whatsapp_test_numbers" rows={3} defaultValue={s.whatsapp_test_numbers.join("\n")} />
                </Field>
                <Field label='Para desligar o modo de teste, digite "PRODUCAO"'><input name="confirm_production" autoComplete="off" /></Field>
              </div>
              <div className="space-y-3">
                <Field label="Palavras de descadastro (uma por linha)" hint="Mensagem igual à palavra, ou frase curta que a contenha → bloqueio imediato">
                  <textarea name="opt_out_keywords" rows={6} defaultValue={s.opt_out_keywords.join("\n")} />
                </Field>
                <Field label="Pedido de atendimento humano (uma por linha)" hint="Pausa o agente e marca a conversa para a equipe">
                  <textarea name="human_request_keywords" rows={4} defaultValue={s.human_request_keywords.join("\n")} />
                </Field>
              </div>
            </fieldset>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">Respostas automáticas do agente (IA) não existem nesta fase: toda mensagem enviada é escrita por uma pessoa da equipe.</p>
        </Card>

        <Card title="Templates do WhatsApp (mensagens iniciadas pela empresa)" className="xl:col-span-2">
          <p className="mb-3 text-sm text-muted">
            Crie e aprove os templates no WhatsApp Manager (Meta) e cadastre aqui com o mesmo nome e idioma. Só templates marcados como aprovados podem ser usados,
            e só para contatos com autorização válida. Frequência mínima por contato: {s.template_min_days_between} dias. Custo estimado por envio: {fmtUSD(s.whatsapp_cost_per_message_usd)}.
          </p>
          <div className="space-y-3">
            {((templates ?? []) as Array<{ id: string; name: string; language: string; category: string; body_preview: string; approved_confirmed: boolean; active: boolean; param_count: number }>).map((t) => (
              <details key={t.id} className="rounded-lg border border-line p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <code>{t.name}</code> <span className="text-muted">{t.language} · {t.category} · {t.param_count} parâmetro(s)</span>
                  {t.approved_confirmed ? <Badge tone="ok">aprovado</Badge> : <Badge tone="warn">não confirmado</Badge>}
                  {!t.active && <Badge>inativo</Badge>}
                </summary>
                <ActionForm action={saveTemplate} submitLabel="Salvar template" variant="secondary" className="mt-3">
                  <input type="hidden" name="id" value={t.id} />
                  <TemplateFields t={t} ro={ro} />
                </ActionForm>
              </details>
            ))}
          </div>
          {isAdmin && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium">Cadastrar template</summary>
              <ActionForm action={saveTemplate} submitLabel="Cadastrar" variant="secondary" className="mt-3">
                <TemplateFields ro={false} />
              </ActionForm>
            </details>
          )}
        </Card>

        <Card title="Agentes de IA (SDR e Closer)" className="xl:col-span-2">
          <p className="mb-3 text-sm text-muted">
            Modelo: <code>{serverEnv.anthropicModel}</code> · chave {serverEnv.anthropicApiKey ? <Badge tone="ok">presente</Badge> : <Badge tone="warn">ANTHROPIC_API_KEY ausente</Badge>}
            {" "}· Teste antes no simulador (Agentes). Custos em “Custos e limites”.
          </p>
          <ActionForm action={saveAiSettings} submitLabel="Salvar IA" variant="secondary">
            <fieldset disabled={ro} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Check name="ai_enabled" checked={s.ai_enabled} label="Respostas automáticas pelo WhatsApp" />
                <label className="ml-6 flex items-start gap-2 text-xs text-fg">
                  <input type="checkbox" name="ai_ack" defaultChecked={s.ai_enabled} className="mt-0.5" />
                  Testei no simulador e estou ciente do custo por resposta (limite diário: {s.ai_daily_token_limit.toLocaleString("pt-BR")} tokens).
                </label>
                <Field label="Nome da agência (aparece na apresentação do assistente)"><input name="agency_name" defaultValue={s.agency_name} maxLength={120} /></Field>
                <Field label="Nome do assistente virtual"><input name="assistant_name" defaultValue={s.assistant_name} maxLength={60} /></Field>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Atende das"><input name="agent_hours_start" type="time" defaultValue={s.agent_hours_start.slice(0, 5)} /></Field>
                  <Field label="Até"><input name="agent_hours_end" type="time" defaultValue={s.agent_hours_end.slice(0, 5)} /></Field>
                </div>
                <fieldset className="flex flex-wrap gap-3 text-sm text-fg">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
                    <label key={d} className="flex items-center gap-1"><input type="checkbox" name="agent_days" value={i} defaultChecked={s.agent_days.includes(i)} />{d}</label>
                  ))}
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Profundidade de raciocínio" hint="Maior = mais caro e mais lento">
                    <select name="ai_effort" defaultValue={s.ai_effort}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select>
                  </Field>
                  <Field label="Máx. respostas por conversa/dia"><input name="ai_max_replies_per_conversation_day" type="number" min={1} max={100} defaultValue={s.ai_max_replies_per_conversation_day} /></Field>
                </div>
                <p className="text-xs text-muted">Fora do horário, a resposta é adiada para a abertura (se a janela de 24h ainda estiver aberta).</p>
              </div>
            </fieldset>
          </ActionForm>
        </Card>

        <Card title="Limites diários e estimativas de custo">
          <ActionForm action={saveLimits} submitLabel="Salvar limites" variant="secondary">
            <fieldset disabled={ro} className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresas novas por dia"><input name="daily_company_limit" type="number" min={1} max={500} defaultValue={s.daily_company_limit} /></Field>
              <Field label="Requisições Google Places por dia"><input name="places_daily_request_limit" type="number" min={0} max={1000} defaultValue={s.places_daily_request_limit} /></Field>
              <Field label="Tokens de IA por dia"><input name="ai_daily_token_limit" type="number" min={0} defaultValue={s.ai_daily_token_limit} /></Field>
              <Field label="Mensagens WhatsApp por dia"><input name="whatsapp_daily_message_limit" type="number" min={0} defaultValue={s.whatsapp_daily_message_limit} /></Field>
              <Field label="US$ por requisição Places" hint="Confira a tabela oficial"><input name="places_cost_per_request_usd" type="number" step="0.00001" min={0} defaultValue={s.places_cost_per_request_usd} /></Field>
              <Field label="US$ por mensagem WhatsApp" hint="Varia por categoria/país"><input name="whatsapp_cost_per_message_usd" type="number" step="0.00001" min={0} defaultValue={s.whatsapp_cost_per_message_usd} /></Field>
              <Field label="US$ por 1M tokens de entrada (IA)"><input name="ai_cost_per_mtok_input_usd" type="number" step="0.01" min={0} defaultValue={s.ai_cost_per_mtok_input_usd} /></Field>
              <Field label="US$ por 1M tokens de saída (IA)"><input name="ai_cost_per_mtok_output_usd" type="number" step="0.01" min={0} defaultValue={s.ai_cost_per_mtok_output_usd} /></Field>
              <Field label="Retenção de mensagens (dias)"><input name="data_retention_days" type="number" min={30} max={3650} defaultValue={s.data_retention_days} /></Field>
              <Field label="Validade dos dados do Google Places (dias)"><input name="places_content_ttl_days" type="number" min={1} max={365} defaultValue={s.places_content_ttl_days} /></Field>
            </fieldset>
          </ActionForm>
        </Card>

        <Card title="Oferta comercial">
          <ActionForm action={saveOffer} submitLabel="Salvar oferta" variant="secondary">
            <fieldset disabled={ro} className="grid gap-3">
              <Field label="Produto"><input name="product_name" defaultValue={s.offer.product_name} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Preço (R$)"><input name="price" defaultValue={(s.offer.price_cents / 100).toFixed(2).replace(".", ",")} /></Field>
                <Field label="Desconto máximo autorizado (%)" hint="0 = o agente não oferece descontos"><input name="max_discount_percent" type="number" min={0} max={50} defaultValue={s.offer.max_discount_percent} /></Field>
              </div>
              <Field label="Incluído (um item por linha)"><textarea name="includes" rows={6} defaultValue={s.offer.includes.join("\n")} /></Field>
              <Field label="Não incluído / custos adicionais (um por linha)" hint="Explicados ao cliente antes da contratação"><textarea name="not_included" rows={4} defaultValue={s.offer.not_included.join("\n")} /></Field>
              <Field label="Condições de pagamento" hint="Se vazio, o agente dirá que um responsável informará"><textarea name="payment_terms" rows={2} defaultValue={s.offer.payment_terms} /></Field>
              <Field label="Prazo de entrega"><input name="delivery_time" defaultValue={s.offer.delivery_time} placeholder="Ex.: até 7 dias úteis após envio do material" /></Field>
            </fieldset>
          </ActionForm>
        </Card>

        <Card title="Pontuação (Agente Analyst)">
          <ActionForm action={saveScoring} submitLabel="Salvar critérios" variant="secondary">
            <fieldset disabled={ro} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Alta prioridade a partir de"><input name="alta" type="number" min={1} max={100} defaultValue={s.scoring_thresholds.alta} /></Field>
                <Field label="Média prioridade a partir de"><input name="media" type="number" min={0} max={99} defaultValue={s.scoring_thresholds.media} /></Field>
              </div>
              <Field label="Pesos por categoria do Google (0–15, JSON)" hint='Chave "_default" para categorias não listadas'>
                <textarea name="category_weights" rows={10} className="font-mono text-xs" defaultValue={JSON.stringify(s.category_weights, null, 2)} />
              </Field>
            </fieldset>
          </ActionForm>
        </Card>

        <Card title="Áreas de busca (Agente Scout)" className="xl:col-span-2">
          <div className="space-y-4">
            {((areas ?? []) as Area[]).map((a) => (
              <div key={a.id} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{a.name}</span>
                  <Badge tone={a.active ? "ok" : "neutral"}>{a.active ? "Ativa" : "Inativa"}</Badge>
                  <span className="text-xs text-muted">raio {a.radius_m / 1000} km · prioridade {a.priority} · próxima categoria: {a.categories[a.category_cursor % Math.max(1, a.categories.length)]}</span>
                </div>
                <ActionForm action={updateSearchArea} submitLabel="Salvar área" variant="secondary">
                  <fieldset disabled={ro} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="id" value={a.id} />
                    <Field label="Categorias pesquisadas (uma por linha, em rodízio diário)"><textarea name="categories" rows={4} defaultValue={a.categories.join("\n")} /></Field>
                    <Check name="active" checked={a.active} label="Ativa" />
                  </fieldset>
                </ActionForm>
              </div>
            ))}
          </div>
          {isAdmin && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Adicionar cidade ou região</summary>
              <ActionForm action={addSearchArea} submitLabel="Adicionar área" variant="secondary" className="mt-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Cidade"><input name="city" required /></Field>
                  <Field label="UF"><input name="state" required maxLength={2} /></Field>
                  <Field label="Prioridade (menor = primeiro)"><input name="priority" type="number" defaultValue={100} /></Field>
                  <Field label="Latitude (opcional)"><input name="latitude" type="number" step="any" /></Field>
                  <Field label="Longitude (opcional)"><input name="longitude" type="number" step="any" /></Field>
                  <Field label="Raio (m)"><input name="radius_m" type="number" defaultValue={8000} min={500} max={50000} /></Field>
                  <div className="sm:col-span-3"><Field label="Categorias (uma por linha)"><textarea name="categories" rows={4} required placeholder={"salão de beleza\noficina mecânica"} /></Field></div>
                </div>
              </ActionForm>
            </details>
          )}
        </Card>

        <Card title="Feriados (campanhas não executam)">
          <ul className="mb-3 divide-y divide-line text-sm">
            {(holidays ?? []).map((h) => (
              <li key={h.holiday_date} className="flex items-center justify-between gap-2 py-1.5">
                <span><span className="tabular-nums">{fmtDate(h.holiday_date)}</span> — {h.name} <span className="text-xs text-muted">({h.scope})</span></span>
                {isAdmin && (
                  <ActionForm action={deleteHoliday} submitLabel="Remover" variant="secondary">
                    <input type="hidden" name="holiday_date" value={h.holiday_date} />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <ActionForm action={addHoliday} submitLabel="Adicionar feriado" variant="secondary">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Data"><input name="holiday_date" type="date" required /></Field>
                <Field label="Nome"><input name="name" required placeholder="Aniversário da cidade" /></Field>
                <Field label="Abrangência">
                  <select name="scope" defaultValue="municipal"><option value="municipal">Municipal</option><option value="estadual">Estadual</option><option value="nacional">Nacional</option><option value="empresa">Empresa</option></select>
                </Field>
              </div>
            </ActionForm>
          )}
          <p className="mt-2 text-xs text-muted">Feriados municipais de Sant&apos;Ana do Livramento devem ser conferidos e cadastrados aqui.</p>
        </Card>

        <Card title="Lista de bloqueio (descadastro)">
          {canOperate && (
            <ActionForm action={suppressPhone} submitLabel="Bloquear número" variant="danger" className="mb-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Telefone"><input name="phone" required /></Field>
                <Field label="Motivo"><input name="reason" required /></Field>
              </div>
            </ActionForm>
          )}
          {(suppression ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhum número bloqueado.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(suppression ?? []).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>{formatBrPhone(x.phone_e164)} <span className="text-xs text-muted">— {x.reason} · {fmtDateTime(x.created_at)}</span></span>
                  {isAdmin && (
                    <ActionForm action={removeSuppression} submitLabel="Remover" variant="secondary">
                      <input type="hidden" name="id" value={x.id} />
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Usuários e papéis">
          <ul className="mb-3 divide-y divide-line text-sm">
            {((users ?? []) as Profile[]).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="truncate">{u.email}</span>
                <Badge tone={u.role === "admin" ? "info" : u.role === "pending" ? "warn" : "neutral"}>{ROLE_LABELS[u.role]}</Badge>
              </li>
            ))}
          </ul>
          {isAdmin && (
            <ActionForm action={setUserRole} submitLabel="Alterar papel" variant="secondary">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="E-mail"><input name="email" type="email" required /></Field>
                <Field label="Papel">
                  <select name="role" defaultValue="viewer">{Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </Field>
              </div>
            </ActionForm>
          )}
          <p className="mt-2 text-xs text-muted">Novos usuários são convidados em Supabase → Authentication (cadastro público desativado) e entram sem acesso.</p>
        </Card>

        <Card title="Dados demonstrativos">
          <Notice tone="info">
            {demoCount ?? 0} registros fictícios (prefixo [DEMO], DDD 00, sem telefone internacional). O banco impede autorização e contato para eles.
          </Notice>
          {isAdmin && (demoCount ?? 0) > 0 && (
            <ActionForm action={deleteDemoData} submitLabel="Excluir dados demonstrativos" variant="danger" className="mt-3">
              <Field label='Digite "EXCLUIR DEMO" para confirmar'><input name="confirm" required autoComplete="off" /></Field>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  );
}

function TemplateFields({ t, ro }: { t?: { name: string; language: string; category: string; body_preview: string; approved_confirmed: boolean; active: boolean }; ro: boolean }) {
  return (
    <fieldset disabled={ro} className="grid gap-3 sm:grid-cols-3">
      <Field label="Nome (igual à Meta)"><input name="name" required defaultValue={t?.name} placeholder="boas_vindas_site" /></Field>
      <Field label="Idioma"><input name="language" defaultValue={t?.language ?? "pt_BR"} /></Field>
      <Field label="Categoria">
        <select name="category" defaultValue={t?.category ?? "marketing"}><option value="marketing">Marketing</option><option value="utility">Utilidade</option></select>
      </Field>
      <div className="sm:col-span-3"><Field label="Texto do corpo (com {{1}}, {{2}}…)"><textarea name="body_preview" rows={3} required defaultValue={t?.body_preview} /></Field></div>
      <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" name="approved_confirmed" defaultChecked={t?.approved_confirmed} />Aprovado pela Meta</label>
      {t && <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" name="active" defaultChecked={t.active} />Ativo</label>}
    </fieldset>
  );
}

function Check({ name, checked, label, disabled }: { name: string; checked: boolean; label: string; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-fg">
      <input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} />
      {label}
    </label>
  );
}
