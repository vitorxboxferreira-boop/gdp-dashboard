# Arquitetura

## Visão geral

```mermaid
flowchart LR
  subgraph Supabase
    CRON[pg_cron<br/>*/5 08:00–12:55 seg–sex] -->|pg_net + x-cron-secret| EF[Edge Function<br/>agent-runner]
    EF -->|service_role| DB[(PostgreSQL<br/>RLS + auditoria)]
    AUTH[Supabase Auth]
  end
  EF -->|Text Search| GP[Google Places API New]
  subgraph Vercel
    UI[Painel Next.js<br/>Server Components + Server Actions]
  end
  UI -->|sessão do usuário (RLS)| DB
  UI -->|service_role, após checar papel| DB
  UI -->|Pesquisar agora| GP
  UI --- AUTH
  WA[WhatsApp Cloud API] -.->|webhook (Fase 2)| UI
  LLM[Anthropic] -.->|Fase 3| EF
```

* **Painel (Vercel)**: leitura com o cliente do usuário (RLS aplica permissões). Ações privilegiadas (executar agentes) usam a chave de serviço **somente no servidor**, depois de `requireActionRole()`.
* **Edge Function `agent-runner`**: executada pelo Cron; cria a campanha do dia (se dia útil e piloto automático ligado) e processa a fila. Funciona sem nenhum computador local ligado.
* **Núcleo compartilhado** (`supabase/functions/_shared/core`): TypeScript puro, sem dependências, importado tanto pelo Next.js (Node) quanto pela Edge Function (Deno). Acesso a dados por uma interface `Repo` (implementações: `SupabaseRepo` e `MemoryRepo` para testes).

## Agentes

| Agente | Fase | Implementação |
|---|---|---|
| Scout | 1 | `runScout()` — Places Text Search por área/categoria em rodízio, deduplicação (Place ID, telefone, nome normalizado + cidade + telefone), limites diários de empresas e requisições, registro de custo por chamada, respeita a parada de emergência entre requisições. |
| Analyst | 1 | `scoreCompany()` — regras determinísticas 0–100 com justificativa por critério; prioridade alta/média/baixa/verificar. Sem IA, sem inventar dados. |
| SDR | 3 | `runSdrReply()` — Claude (SDK oficial, saída estruturada) redige a resposta e classifica a intenção; o código aplica as travas e decide envio/transferência. |
| Closer | 3 | Mesmo executor com instruções de Closer quando há interesse forte; registra oportunidade (`sales` pendente de aprovação humana) e transfere. Aprovação/pagamento: Fase 4. |

### Pontuação (analyst-v1)

| Critério | Pontos |
|---|---|
| Site: verificado sem site 40 · só redes sociais 32 · não identificado 30 (marca “verificar”) · possui site 0 | até 40 |
| Presença digital (avaliações públicas; +3 se nota ≥ 4,5) | até 15 |
| Informações disponíveis (endereço, telefone) | até 10 |
| Categoria (pesos configuráveis por tipo do Google) | até 15 |
| Potencial (negócio ativo sem site próprio) | até 10 |
| Facilidade de contato (celular 10, fixo 6) — **não** implica autorização | até 10 |
| Status não operacional | −10 |

Prioridade: sem telefone ou status não operacional (e sem site próprio) → **verificar**; possui site próprio → **baixa**; ≥ 70 **alta**; ≥ 45 **média**; senão **baixa**. Limiares e pesos editáveis no painel.

## Campanha diária e fila

| Meta (America/Sao_Paulo) | Tarefa | Depende de |
|---|---|---|
| 08:00 | `campaign.start` | — |
| 08:05 | `scout.search` | start |
| 08:20 | `analyst.score` | scout |
| 08:30 | `leads.classify` | analyst |
| 08:40 | `eligibility.check` | classify |
| 11:45 | `report.prepare` | eligibility (executa mesmo com falha anterior, para relatá-la) |
| 12:00 | `report.publish` | prepare |

* Uma campanha automática por dia (índice único parcial) e tarefas com `idempotency_key` único.
* `claim_jobs()` usa `FOR UPDATE SKIP LOCKED`; locks expirados (worker caiu) são recuperados.
* Falhas temporárias (rede, 429, 5xx) voltam à fila com backoff exponencial (30 s → 30 min); erros definitivos (4xx, chave inválida) viram `dead` sem novas tentativas.
* Etapa cuja dependência ainda não terminou é adiada sem consumir tentativa.
* Fins de semana e feriados (tabela `holidays`) bloqueiam a campanha, salvo configuração explícita.
* Parada de emergência: `set_automation_paused(true)` marca a pausa e cancela tarefas pendentes; o Scout verifica a pausa a cada requisição; só admin retoma.

## Segurança

* RLS em todas as tabelas; `anon` sem acesso a nenhuma tabela; funções sensíveis sem `EXECUTE` para `anon`; RPCs de fila só para `service_role`.
* Papéis em `profiles.role` (`pending` por padrão). Funções `is_staff()/can_operate()/is_admin()` são `security definer` para evitar recursão.
* Auditoria (`audit_logs`) por trigger em tabelas de negócio — registra apenas colunas alteradas — e ações customizadas (`log_action`).
* Autorizações de contato: evidência imutável, revogação irreversível, bloqueio revoga autorizações e marca leads como bloqueados; autorizações para dados demonstrativos ou números bloqueados são recusadas pelo banco.
* Dados demonstrativos: constraint `leads_demo_never_contactable_ck` + trigger.
* Edge Function protegida por segredo comparado em tempo constante (`x-cron-secret`, ≥ 32 caracteres).
* Next.js: `server-only` em módulos com segredos, headers de segurança (HSTS, X-Frame-Options, nosniff…), sessão validada com `getClaims()` no proxy.

## Agentes de conversa (Fase 3)

```mermaid
sequenceDiagram
  participant C as Cliente (WhatsApp)
  participant W as Webhook /api/webhooks/whatsapp
  participant DB as PostgreSQL
  participant Q as Fila (sdr.reply)
  participant A as runSdrReply
  participant L as Claude (Anthropic)
  C->>W: mensagem (assinada pela Meta)
  W->>DB: ingest_whatsapp_message (idempotente)
  DB->>Q: trigger: tarefa sdr.reply (run_after +8 s, 1 por wamid)
  W-->>C: 200 para a Meta
  W->>A: after(): processa a fila (fallback: Cron/Edge Function)
  A->>DB: contexto, whatsapp_send_check('agente') — bloqueado? para aqui, sem custo de IA
  A->>L: prompt estável (cacheado) + contexto + histórico
  L-->>A: JSON {reply, intent, next_stage, handoff, oportunidade, resumo}
  A->>A: travas (preço, desconto, promessas, identificação, tamanho)
  A->>C: envio (Cloud API) ou mensagem de transferência
  A->>DB: apply_agent_decision (estágio, papel, oportunidade, humano assume)
```

* **Modelo**: `ANTHROPIC_MODEL` (padrão `claude-opus-5-5`), esforço configurável (padrão baixo), saída estruturada validada com zod, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) para recusas de segurança. Recusa, JSON inválido ou corte → equipe assume.
* **Cache**: regras + oferta + base de conhecimento vão em um bloco de sistema estável com `cache_control`; data/hora e dados da conversa ficam depois.
* **Ordem de custo**: verificações baratas (mais recente? já respondida? horário? `whatsapp_send_check`? limites) antes de chamar a IA.
* **Idempotência**: uma tarefa por `wamid`; envio com chave `agent:{wamid}` — em falha temporária, a mesma mensagem é reenviada, nunca duplicada.
* **Falha definitiva** da tarefa → conversa passa para atendimento humano com o motivo.
* **Descadastro** detectado pela IA (frases que as palavras-chave não pegam) → `agent_opt_out()`, sem resposta.
