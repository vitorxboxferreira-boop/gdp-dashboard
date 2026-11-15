import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBrPhone } from "@core/phone.ts";
import { registerConsent, revokeConsent, suppressPhone } from "@/actions/consents";
import { updateCompanyNotes, verifyWebsite } from "@/actions/companies";
import { updateLeadStage } from "@/actions/leads";
import { sendTemplateToCompany } from "@/actions/templates";
import { ActionForm } from "@/components/action-form";
import { ContactBadge, DemoBadge, PriorityBadge, StageBadge, WebsiteBadge } from "@/components/badges";
import { Badge, Card, Field, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { hasRole, requirePageRole } from "@/lib/auth";
import { fmtDateTime, STAGE_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyRow, LeadRow } from "@/lib/types";

export const metadata = { title: "Empresa" };

const CONSENT_SOURCES: Array<[string, string]> = [
  ["mensagem_recebida", "O contato iniciou a conversa"],
  ["formulario_site", "Formulário com termo de aceite"],
  ["presencial", "Autorização presencial registrada"],
  ["telefone", "Autorização verbal por telefone"],
  ["outro", "Outra (descrever)"],
];

interface ConsentRow {
  id: string;
  phone_e164: string;
  source: string;
  evidence: string;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await requirePageRole("viewer");
  const canOperate = hasRole(profile, "operator");
  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) notFound();
  const c = company as CompanyRow;

  const [{ data: leadData }, { data: consents }, { data: suppressed }, { data: history }, { data: templates }] = await Promise.all([
    supabase.from("leads").select("*").eq("company_id", id).maybeSingle(),
    supabase.from("consents").select("*").eq("company_id", id).order("granted_at", { ascending: false }),
    c.phone_e164
      ? supabase.from("suppression_list").select("id, reason, created_at").eq("phone_e164", c.phone_e164).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("audit_logs").select("id, occurred_at, action, actor_type, new_data").eq("entity", "companies").eq("entity_id", id).order("occurred_at", { ascending: false }).limit(15),
    supabase.from("whatsapp_templates").select("id, name, language, category, body_preview, param_count").eq("active", true).eq("approved_confirmed", true).order("name"),
  ]);
  const tpls = (templates ?? []) as Array<{ id: string; name: string; language: string; category: string; body_preview: string; param_count: number }>;
  const maxParams = Math.max(0, ...tpls.map((t) => t.param_count));
  const lead = leadData as LeadRow | null;
  const reasons = Array.isArray(lead?.score_reasons) ? [] : lead?.score_reasons?.reasons ?? [];
  const needs = Array.isArray(lead?.score_reasons) ? [] : lead?.score_reasons?.needs_verification ?? [];

  return (
    <>
      <PageHeader
        title={c.name}
        description={[c.category_label ?? c.primary_category, c.city && `${c.city}/${c.state ?? ""}`].filter(Boolean).join(" · ")}
        actions={<Link href="/empresas" className="text-sm text-accent underline">Voltar</Link>}
      />

      {c.is_demo && (
        <div className="mb-4">
          <Notice tone="info" title="Registro demonstrativo (fictício)">
            Este registro não corresponde a uma empresa real. O banco impede qualquer autorização ou contato para dados demonstrativos.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Dados da empresa" className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Item label="Origem">{c.source === "google_places" ? "Google Places" : c.source === "manual" ? "Cadastro manual" : <DemoBadge />}</Item>
            <Item label="Situação">{c.business_status ?? "—"}</Item>
            <Item label="Endereço">{c.formatted_address ?? "—"}</Item>
            <Item label="Telefone">{c.phone_e164 ? formatBrPhone(c.phone_e164) : c.phone_national ?? "—"}</Item>
            <Item label="Site">
              <div className="flex flex-wrap items-center gap-2">
                <WebsiteBadge status={c.website_status} />
                {c.website_uri && <a href={c.website_uri} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent underline">{c.website_uri}</a>}
              </div>
              {c.website_verified_at && <div className="mt-1 text-xs text-muted">Verificado em {fmtDateTime(c.website_verified_at)}</div>}
            </Item>
            <Item label="Avaliações">{c.user_rating_count != null ? `${c.rating ?? "—"} ★ (${c.user_rating_count})` : "—"}</Item>
            <Item label="Google Maps">{c.google_maps_uri ? <a href={c.google_maps_uri} target="_blank" rel="noopener noreferrer" className="text-accent underline">Abrir no Maps</a> : "—"}</Item>
            <Item label="Descoberta / última atualização">{fmtDateTime(c.discovered_at)} / {fmtDateTime(c.last_seen_at)}</Item>
            {c.places_data_expires_at && <Item label="Dados do Places expiram em">{fmtDateTime(c.places_data_expires_at)}</Item>}
          </dl>
        </Card>

        <Card title="Pontuação (Agente Analyst)">
          {lead?.score != null ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-3xl font-semibold tabular-nums">{lead.score}</span>
                <PriorityBadge priority={lead.priority} />
              </div>
              <ul className="space-y-1.5 text-sm">
                {reasons.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-muted">{r.detail}</span>
                    <span className="shrink-0 tabular-nums">{r.points > 0 ? `+${r.points}` : r.points}</span>
                  </li>
                ))}
              </ul>
              {needs.length > 0 && (
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <div className="mb-1 font-medium">Necessita verificação</div>
                  <ul className="list-disc pl-5 text-muted">{needs.map((n) => <li key={n}>{n}</li>)}</ul>
                </div>
              )}
              <p className="mt-3 text-xs text-muted">Calculada em {fmtDateTime(lead.scored_at)}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Ainda não analisada. Use “Reanalisar pontuações” na Visão geral.</p>
          )}
        </Card>

        {canOperate && !c.is_demo && (
          <Card title="Verificação do site">
            <p className="mb-3 text-sm text-muted">Confirme manualmente (pesquisa na web, contato) antes de afirmar que a empresa não tem site.</p>
            <ActionForm action={verifyWebsite} submitLabel="Registrar verificação" variant="secondary">
              <input type="hidden" name="company_id" value={c.id} />
              <div className="space-y-3">
                <Field label="Resultado">
                  <select name="status" defaultValue="verified_none">
                    <option value="verified_none">Verificado: não possui site</option>
                    <option value="verified_exists">Verificado: possui site</option>
                    <option value="not_identified">Desfazer verificação</option>
                  </select>
                </Field>
                <Field label="URL do site (se encontrado)"><input name="website_uri" type="url" placeholder="https://" /></Field>
              </div>
            </ActionForm>
          </Card>
        )}

        <Card title="Contato por WhatsApp" className={canOperate && !c.is_demo ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {lead ? <ContactBadge status={lead.contact_status} /> : <Badge>Sem lead</Badge>}
            {suppressed && <Badge tone="danger">Na lista de bloqueio</Badge>}
          </div>
          {lead && (
            <ul className="mb-3 list-disc pl-5 text-sm text-muted">
              {(lead.eligibility_reasons ?? []).map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          <Notice tone="warn">
            Mensagens iniciadas pela empresa só podem ser enviadas a contatos com autorização válida, sem bloqueio, respeitando a janela de
            atendimento/templates aprovados e os limites diários. Ter um telefone público não constitui autorização.
          </Notice>

          {(consents ?? []).length > 0 && (
            <div className="mt-4">
              <Table>
                <thead><tr><Th>Telefone</Th><Th>Origem</Th><Th>Evidência</Th><Th>Concedida</Th><Th>Situação</Th>{canOperate && <Th />}</tr></thead>
                <tbody>
                  {(consents as ConsentRow[]).map((k) => (
                    <tr key={k.id}>
                      <Td className="whitespace-nowrap">{formatBrPhone(k.phone_e164)}</Td>
                      <Td>{CONSENT_SOURCES.find(([v]) => v === k.source)?.[1] ?? k.source}</Td>
                      <Td className="max-w-xs text-xs">{k.evidence}</Td>
                      <Td className="whitespace-nowrap text-xs">{fmtDateTime(k.granted_at)}</Td>
                      <Td>{k.revoked_at ? <Badge tone="danger">Revogada</Badge> : <Badge tone="ok">Ativa</Badge>}</Td>
                      {canOperate && (
                        <Td>
                          {!k.revoked_at && (
                            <ActionForm action={revokeConsent} submitLabel="Revogar" variant="secondary">
                              <input type="hidden" name="consent_id" value={k.id} />
                              <input type="hidden" name="company_id" value={c.id} />
                            </ActionForm>
                          )}
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {canOperate && !c.is_demo && (
            <div className="mt-5 grid gap-6 border-t border-line pt-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Registrar autorização</h3>
                <ActionForm action={registerConsent} submitLabel="Registrar autorização" variant="secondary">
                  <input type="hidden" name="company_id" value={c.id} />
                  <div className="space-y-3">
                    <Field label="Telefone autorizado"><input name="phone" required defaultValue={c.phone_e164 ?? ""} /></Field>
                    <Field label="Origem">
                      <select name="source" required>{CONSENT_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    </Field>
                    <Field label="Data e hora (Brasília)"><input name="granted_at" type="datetime-local" required /></Field>
                    <Field label="Validade (opcional)"><input name="expires_at" type="datetime-local" /></Field>
                    <Field label="Evidência" hint="Ex.: link/print do formulário, ID da mensagem recebida, quem coletou e como.">
                      <textarea name="evidence" required minLength={10} rows={3} />
                    </Field>
                    <label className="flex items-start gap-2 text-sm text-fg">
                      <input type="checkbox" name="confirm" required className="mt-1" />
                      Confirmo que o titular do número autorizou receber mensagens comerciais pelo WhatsApp.
                    </label>
                  </div>
                </ActionForm>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Bloquear / descadastrar</h3>
                <ActionForm action={suppressPhone} submitLabel="Bloquear número" variant="danger">
                  <div className="space-y-3">
                    <Field label="Telefone"><input name="phone" required defaultValue={c.phone_e164 ?? ""} /></Field>
                    <Field label="Motivo"><input name="reason" required placeholder="Pediu para não ser contatado" /></Field>
                  </div>
                </ActionForm>
              </div>
            </div>
          )}
        </Card>

        {canOperate && !c.is_demo && lead?.contact_status === "elegivel" && (
          <Card title="Iniciar conversa (template aprovado)" className="lg:col-span-2">
            <p className="mb-3 text-sm text-muted">
              Contato com autorização válida. Mensagens iniciadas pela empresa só podem usar templates aprovados pela Meta e respeitam a frequência mínima configurada.
            </p>
            {tpls.length === 0 ? (
              <p className="text-sm text-muted">Nenhum template ativo marcado como aprovado. Cadastre em Configurações → Templates.</p>
            ) : (
              <ActionForm action={sendTemplateToCompany} submitLabel="Enviar template" variant="secondary">
                <input type="hidden" name="company_id" value={c.id} />
                <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Template">
                    <select name="template_id" required>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category}, {t.param_count} parâmetro{t.param_count === 1 ? "" : "s"})</option>)}</select>
                  </Field>
                  {Array.from({ length: maxParams }, (_, i) => (
                    <Field key={i} label={`Parâmetro {{${i + 1}}}`} hint="Deixe em branco se o template escolhido não usa"><input name={`param_${i + 1}`} defaultValue={i === 0 ? c.name : ""} /></Field>
                  ))}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted">{tpls.map((t) => <li key={t.id}><b>{t.name}:</b> {t.body_preview}</li>)}</ul>
              </ActionForm>
            )}
          </Card>
        )}

        {lead && (
          <Card title="Etapa comercial">
            <div className="mb-3"><StageBadge stage={lead.stage} /></div>
            {canOperate && (
              <ActionForm action={updateLeadStage} submitLabel="Atualizar etapa" variant="secondary">
                <input type="hidden" name="lead_id" value={lead.id} />
                <div className="space-y-3">
                  <Field label="Nova etapa">
                    <select name="stage" defaultValue={["novo", "qualificado", "perdido", "descartado"].includes(lead.stage) ? lead.stage : "qualificado"}>
                      {(["novo", "qualificado", "perdido", "descartado"] as const).map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                    </select>
                  </Field>
                  <Field label="Motivo (perdido/descartado)"><input name="lost_reason" maxLength={500} /></Field>
                </div>
              </ActionForm>
            )}
          </Card>
        )}

        <Card title="Observações" className="lg:col-span-2">
          {canOperate ? (
            <ActionForm action={updateCompanyNotes} submitLabel="Salvar observações" variant="secondary">
              <input type="hidden" name="company_id" value={c.id} />
              <textarea name="notes" rows={4} maxLength={2000} defaultValue={c.notes ?? ""} />
            </ActionForm>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted">{c.notes || "—"}</p>
          )}
        </Card>

        {hasRole(profile, "admin") && (
          <Card title="Histórico de alterações" className="lg:col-span-3">
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-muted">Sem alterações registradas.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {(history ?? []).map((h) => (
                  <li key={h.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <span className="shrink-0 text-muted">{fmtDateTime(h.occurred_at)}</span>
                    <span className="shrink-0">{h.action} ({h.actor_type})</span>
                    <code className="break-all text-muted">{h.new_data ? Object.keys(h.new_data).join(", ") : ""}</code>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
