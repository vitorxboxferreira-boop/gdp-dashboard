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

### Webhook do WhatsApp — `/api/webhooks/whatsapp` (Fase 2)

Registre no app da Meta (WhatsApp → Configuration → Webhook) a URL `https://<dominio>/api/webhooks/whatsapp`, o *verify token* igual a `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e assine o campo **messages**.

**GET** (verificação): `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` → `200 <challenge>` · `403` token incorreto · `503` token não configurado.

**POST** (eventos):

1. Corpo limitado a 1 MB.
2. `X-Hub-Signature-256` validado com HMAC-SHA256(`WHATSAPP_APP_SECRET`, corpo bruto), comparação em tempo constante → `401` se inválido. **Nada é gravado antes desta validação.**
3. Eventos de outro `phone_number_id` (≠ `WHATSAPP_PHONE_NUMBER_ID`) são ignorados.
4. Mensagens → `ingest_whatsapp_message()` (idempotente por `wamid` via `processed_events` + `messages.wa_message_id` único). Mídia não é baixada; só o tipo e a legenda são registrados.
5. Status (`sent`, `delivered`, `read`, `failed`) → `apply_whatsapp_status()`; o status nunca regride.
6. Resposta `200 {ok, received, duplicates, opt_outs, human_requests, statuses, skipped}`. Erro de banco → `500` (a Meta reenvia; o reprocessamento é seguro).

Regras aplicadas no recebimento:

* Janela de atendimento: `service_window_expires_at = última mensagem do cliente + 24h`.
* Descadastro: mensagem igual a uma palavra-chave (padrão: parar, sair, stop, cancelar, descadastrar…) ou frase-chave em mensagem curta → número entra na `suppression_list`, autorizações são revogadas, agente pausado.
* Pedido de humano ("atendente", "falar com alguém"…) → conversa passa a atendimento humano e o agente é pausado.
* Receber mensagem **não** cria autorização para mensagens futuras iniciadas pela empresa.
* Telefone existente em `companies` vincula a conversa à empresa/lead (lead vai para "em conversa").

### Envio (Graph API)

`POST https://graph.facebook.com/{WHATSAPP_GRAPH_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages` com `type: "text"`. Usado **apenas** pelo envio manual da equipe, na ordem:

1. Papel ≥ operador; credenciais configuradas.
2. `whatsapp_send_check(conversa, 'humano', 'free_text')` — bloqueia se: WhatsApp desabilitado, conversa encerrada, número descadastrado/bloqueado, dado demonstrativo, **modo de teste** com número fora da lista, janela de 24h fechada, limite diário atingido.
3. `register_outbound_message()` com chave de idempotência gerada no navegador (duplo clique não duplica).
4. Chamada à API → `complete_outbound_message()` grava `wamid` ou o erro.

Templates (mensagens iniciadas pela empresa) **não** estão implementados; `whatsapp_send_check(..., 'template')` já exige autorização válida e retorna bloqueado.

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
| `ingest_whatsapp_message(...)` | service_role | Recebimento idempotente |
| `apply_whatsapp_status(wamid, status, ts, error)` | service_role | Status de entrega |
| `whatsapp_send_check(conversa, sender, kind)` | operator / service_role | Verificação de envio |
| `register_outbound_message / complete_outbound_message` | service_role | Registro de envio |
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
