# APIs, webhooks e RPCs

## Endpoints HTTP

### `POST {SUPABASE_URL}/functions/v1/agent-runner` (Edge Function)

Chamado pelo Supabase Cron. Não exige JWT (`verify_jwt = false`); exige o cabeçalho `x-cron-secret`.

| Cabeçalho | Valor |
|---|---|
| `x-cron-secret` | igual ao segredo `CRON_SECRET` da função (≥ 32 caracteres) |

Respostas: `200 {ok, worker, paused?, dayStatus, campaign, processed[]}` · `401` segredo inválido · `405` método · `503` função não configurada · `500` erro inesperado (detalhe no log).

Teste manual:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/agent-runner" -H "x-cron-secret: $CRON_SECRET"
```

### `GET /api/health` (painel)

`200 {"status":"ok","supabaseConfigured":true,"time":"…"}` — sem dados sensíveis; público.

### Webhook do WhatsApp — **Fase 2 (não implementado)**

Planejado: `GET /api/webhooks/whatsapp` (verificação `hub.mode/hub.verify_token/hub.challenge` com `WHATSAPP_WEBHOOK_VERIFY_TOKEN`) e `POST /api/webhooks/whatsapp` com validação HMAC-SHA256 de `X-Hub-Signature-256` usando `WHATSAPP_APP_SECRET` sobre o corpo bruto, deduplicação em `processed_events (source='whatsapp', event_id=wamid)` e `messages.wa_message_id` único, descadastro imediato por palavras-chave (PARAR/SAIR).

## Integrações externas

### Google Places API (New) — Text Search

`POST https://places.googleapis.com/v1/places:searchText`

* Cabeçalhos: `X-Goog-Api-Key`, `X-Goog-FieldMask` (ver `PLACES_FIELD_MASK` em `supabase/functions/_shared/core/places.ts`).
* Corpo: `textQuery` (“{categoria} em {cidade}, {UF}”), `languageCode: pt-BR`, `regionCode: BR`, `pageSize: 20`, `locationBias.circle` (centro + raio da área), `pageToken` para paginação (máx. 3 páginas por consulta).
* O field mask inclui `websiteUri` e telefones, o que enquadra a chamada em um SKU mais caro. O custo estimado por requisição é configurável; confira a tabela de preços oficial.
* Cada chamada (sucesso ou falha) é registrada em `usage_events`.
* **Status: implementado e testado com respostas simuladas; NÃO testado contra a API real** (sem chave neste ambiente).

## RPCs do banco (Postgres functions)

| Função | Quem pode | Uso |
|---|---|---|
| `dashboard_metrics()` | staff | Métricas do painel |
| `set_automation_paused(paused, reason)` | operator pausa / admin retoma | Parada de emergência |
| `grant_role(email, role)` | admin (ou SQL Editor) | Papéis |
| `log_action(action, entity, entity_id, metadata)` | staff | Auditoria customizada |
| `compute_whatsapp_eligibility(company_id)` | staff | Avalia elegibilidade (fonte única de verdade) |
| `refresh_lead_eligibility(lead_id)` / `refresh_all_lead_eligibility()` | operator | Atualiza `leads.contact_status` |
| `classify_leads()` | operator | Novos alta/média → qualificado; fechadas → descartado |
| `purge_expired_data()` | admin / cron | Retenção (mensagens, conteúdo do Places, eventos) |
| `companies_pending_scoring(limit)` | service_role | Empresas sem pontuação ou desatualizadas |
| `claim_jobs / complete_job / fail_job / defer_job` | service_role | Fila de tarefas |

## Elegibilidade para WhatsApp

`compute_whatsapp_eligibility` retorna, em ordem de precedência:

1. `demo` — dado demonstrativo (nunca contatar);
2. `nao_contatavel` — sem telefone E.164;
3. `bloqueado` — telefone na `suppression_list`;
4. `elegivel` — autorização ativa (`consents`: canal whatsapp, não revogada, não expirada, data ≤ agora), com origem e data nas razões;
5. `nao_contatavel` — sem autorização.

`elegivel` **não** autoriza envio por si só: na Fase 2 o envio também exigirá integração ativa, janela de atendimento de 24 h ou template aprovado, limites diários e qualidade da conta.
