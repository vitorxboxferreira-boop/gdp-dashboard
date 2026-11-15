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
| SDR | 2–3 | Não implementado. Tabelas `conversations`, `messages`, `consents`, `suppression_list`, `processed_events` já existem. |
| Closer | 3–4 | Não implementado. Tabelas `sales` (aprovação humana obrigatória por constraint) e `appointments` (sem sobreposição de reuniões confirmadas) já existem. |

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
