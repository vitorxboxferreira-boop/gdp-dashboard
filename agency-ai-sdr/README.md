# Agency AI SDR

Plataforma de prospecção, qualificação e negociação comercial para uma agência que vende criação de sites para empresas locais.
Começa por Sant'Ana do Livramento (RS) e permite outras cidades pelo painel.

> **Estado atual: Fases 1 a 4 concluídas** — descoberta/classificação, canal WhatsApp, agentes de IA SDR/Closer com travas,
> agenda (o agente oferece horários; a equipe confirma), aprovação de vendas, notificações, relatórios com CSV e templates
> para iniciar conversa com contatos autorizados. Falta a Fase 5 (segurança, testes com serviços reais, monitoramento, deploy, ativação).
> Nada é simulado. Veja [docs/STATUS.md](docs/STATUS.md), inclusive o roteiro de validação com a Meta.

## Stack

| Camada | Tecnologia |
|---|---|
| Painel | Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS 4 |
| Banco / Auth | Supabase PostgreSQL + Supabase Auth (RLS em todas as tabelas) |
| Rotinas | Supabase Edge Function `agent-runner` + Supabase Cron (pg_cron + pg_net) |
| Descoberta | Google Places API (New): Text Search |
| Hospedagem | Vercel (painel) + Supabase (banco, funções, cron) |
| IA (Fase 3) | Anthropic |
| Mensagens (Fase 2) | WhatsApp Business Platform (Cloud API oficial) |

Arquitetura completa em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). APIs, webhooks e RPCs em [docs/API.md](docs/API.md).

## Estrutura

```
agency-ai-sdr/
├── src/
│   ├── app/                     # Rotas (login, setup, privacidade, painel)
│   │   └── (painel)/            # Páginas autenticadas (empresas, leads, campanhas, custos, configurações…)
│   ├── actions/                 # Server Actions (validação zod + verificação de papel)
│   ├── components/              # UI
│   ├── lib/                     # Supabase (server/admin), auth, env, formatação
│   └── proxy.ts                 # Sessão e proteção de rotas (Next 16 "proxy")
├── supabase/
│   ├── migrations/              # SQL versionado (tabelas, índices, RLS, auditoria, fila, RPCs)
│   ├── functions/
│   │   ├── _shared/core/        # Lógica dos agentes (Node + Deno): Places, Scout, Analyst, fila
│   │   └── agent-runner/        # Edge Function chamada pelo Cron
│   ├── sql/activate_cron.sql    # Ativação manual do agendamento (Fase 5)
│   ├── seed.sql                 # Dados DEMONSTRATIVOS fictícios
│   └── config.toml
├── tests/
│   ├── unit/                    # Vitest: telefones, sites, Places, pontuação, calendário, pipeline
│   └── db/                      # Testes SQL: RLS, elegibilidade, idempotência, fila, retenção
└── docs/
```

## Executar localmente

Pré-requisitos: Node.js ≥ 20.9, [Supabase CLI](https://supabase.com/docs/guides/cli) e Docker (para `supabase start`), ou um projeto Supabase de desenvolvimento na nuvem.

```bash
cd agency-ai-sdr
npm install

# Opção A — Supabase local (Docker)
supabase start                    # aplica migrations + seed.sql automaticamente
# use a API URL e as chaves exibidas no .env.local

# Opção B — projeto Supabase de DESENVOLVIMENTO na nuvem
supabase link --project-ref <ref-dev>
supabase db push                  # aplica as migrations
psql "<connection-string-dev>" -f supabase/seed.sql   # opcional: dados fictícios

cp .env.example .env.local        # preencha as variáveis
npm run dev                       # http://localhost:3000
```

### Primeiro administrador

O cadastro público é desativado. Crie o usuário em **Supabase → Authentication → Users → Add user** e, no **SQL Editor**:

```sql
select public.grant_role('voce@suaagencia.com.br', 'admin');
```

Novos usuários entram como `pending` (sem acesso). Papéis: `viewer` (leitura), `operator` (opera empresas/leads, aciona parada de emergência), `admin` (configurações, integrações, papéis, retomar automações).

### Usar o Scout (Google Places)

1. Crie uma chave no Google Cloud com a **Places API (New)** ativada; restrinja a chave a essa API.
2. Defina `GOOGLE_PLACES_API_KEY` no `.env.local` (e como segredo da Edge Function, veja abaixo).
3. No painel: **Configurações → Automação**, marque “Habilitar Google Places” e confirme ciência do custo estimado.
4. Revise os limites (padrão: 50 empresas e 15 requisições por dia).
5. **Visão geral → Pesquisar empresas agora**.

Sem a chave ou sem habilitação, o Scout não faz nenhuma chamada e informa o motivo. O Analyst funciona sem integrações externas (inclusive sobre os dados demonstrativos: botão “Reanalisar pontuações”).

## Credenciais necessárias

| Variável | Onde | Fase | Obrigatória agora |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel / `.env.local` | 1 | Sim |
| `SUPABASE_SECRET_KEY` (service role) | Vercel / `.env.local` (servidor) | 1 | Sim, para executar agentes pelo painel |
| `GOOGLE_PLACES_API_KEY` | Vercel + `supabase secrets` | 1 | Para descoberta real |
| `CRON_SECRET` | `supabase secrets` + Vault | 5 | Ao ativar as rotinas |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Vercel + `supabase secrets` | 3 | Para os agentes SDR/Closer e o simulador |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_GRAPH_API_VERSION` | Vercel (servidor) | 2 | Para o canal WhatsApp |

Regras: chaves privadas **nunca** usam prefixo `NEXT_PUBLIC_`; projetos e chaves separados para desenvolvimento e produção (`APP_ENV` é exibido no painel e há alerta de mistura).

## Testes

```bash
npm run typecheck   # TypeScript (app + núcleo compartilhado)
npm test            # Vitest — testes unitários (pipeline, Places, WhatsApp, webhook)
npm run test:db     # Migrations + testes SQL em PostgreSQL local descartável
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/agency_sdr_test \
  npm run test:integration   # webhook assinado → funções reais do banco (após test:db)
npm run build       # Build de produção
```

`test:db` precisa de `psql` e de um PostgreSQL acessível (ex.: `PGHOST=/var/run/postgresql PGUSER=postgres`). Ele cria um banco `agency_sdr_test`, aplica um shim mínimo do ambiente Supabase (`auth.uid()`, papéis `anon`/`authenticated`/`service_role`), todas as migrations, o seed e os testes.

## Deploy

**Supabase (produção)** — projeto separado do de desenvolvimento:

```bash
supabase link --project-ref <ref-prod>
supabase db push
supabase functions deploy agent-runner
supabase secrets set GOOGLE_PLACES_API_KEY=... CRON_SECRET=$(openssl rand -hex 32) \
  ANTHROPIC_API_KEY=... WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=...
```

Em Authentication → Providers → Email, mantenha **signups desativados**. Configure Site URL com o domínio da Vercel.

**Vercel** — importe o repositório com **Root Directory = `agency-ai-sdr`**, defina as variáveis de produção (`APP_ENV=production`) e publique.

**Rotinas (Fase 5)** — somente após validar a Fase 1: siga `supabase/sql/activate_cron.sql` (Vault + `cron.schedule`). O agendamento roda a cada 5 min das 08:00 às 12:55 (seg–sex, America/Sao_Paulo); o piloto automático precisa estar ligado no painel. Assim o sistema funciona com seu computador desligado.

## Dados demonstrativos

`supabase/seed.sql` cria 5 empresas **fictícias** (`[DEMO] …`, `source = 'demo'`, DDD 00 e sem telefone internacional).
O banco força `contact_status = 'demo'` e recusa autorizações para elas — **nunca** podem ser contatadas. Exclua em Configurações → Dados demonstrativos.

## Conformidade

- LGPD: minimização, retenção configurável (`purge_expired_data()`), descadastro imediato, política em `/privacidade` (modelo — revisar com assessoria jurídica).
- Google Maps Platform: `place_id` é mantido; demais conteúdos do Places expiram após o prazo configurado para empresas sem relacionamento. Revise os termos vigentes da Google.
- WhatsApp: somente Cloud API oficial. Sem WhatsApp Web, QR Code ou bibliotecas não oficiais. Mensagens iniciadas pela empresa apenas para contatos com autorização registrada (com origem, data e evidência).
