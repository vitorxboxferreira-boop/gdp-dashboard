# Deploy e ativação (Fase 5)

Roteiro para colocar em produção. Use **projetos separados** para desenvolvimento e produção (Supabase e chaves de cada integração).
Nada aqui foi executado automaticamente: cada passo exige suas credenciais.

## 1. Supabase (produção)

1. Crie o projeto na região **South America (São Paulo)** e ative **Point-in-Time Recovery** (backup) se o plano permitir.
2. Aplique as migrations:
   ```bash
   cd agency-ai-sdr
   supabase link --project-ref <ref-prod>
   supabase db push
   ```
   **Não** rode `seed.sql` em produção (dados fictícios).
3. Authentication → Providers → Email: **desative o cadastro público**; mantenha confirmação de e-mail. Em URL Configuration, defina *Site URL* com o domínio da Vercel.
4. Crie o primeiro usuário (Authentication → Users) e promova:
   ```sql
   select public.grant_role('voce@suaagencia.com.br', 'admin');
   ```
5. Database → Extensions: habilite `pg_cron` e `pg_net`.

## 2. Edge Function e segredos

```bash
supabase functions deploy agent-runner
supabase secrets set \
  CRON_SECRET=$(openssl rand -hex 32) \
  GOOGLE_PLACES_API_KEY=... \
  ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=claude-opus-5-5 \
  WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_GRAPH_API_VERSION=v23.0
```

Teste manual (deve responder `{"ok":true,...}`; com o piloto automático desligado não cria campanha):

```bash
curl -X POST "https://<ref-prod>.supabase.co/functions/v1/agent-runner" -H "x-cron-secret: <CRON_SECRET>"
```

## 3. Vercel

1. Importe o repositório com **Root Directory = `agency-ai-sdr`**. O `vercel.json` fixa a região `gru1` (São Paulo) e roda `scripts/check-env.mjs` antes do build — o deploy **falha** se houver segredo com prefixo `NEXT_PUBLIC_`, mistura de ambientes ou variáveis obrigatórias ausentes.
2. Variáveis de **Production**: `APP_ENV=production`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GOOGLE_PLACES_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `WHATSAPP_*`, `HEALTHCHECK_TOKEN` (`openssl rand -hex 32`), `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_DOCUMENT`, `NEXT_PUBLIC_PRIVACY_EMAIL`.
3. Variáveis de **Preview/Development**: as do projeto Supabase de desenvolvimento, `APP_ENV=development`.
4. Localmente, antes de publicar: `npm run check:env:prod` com as variáveis de produção carregadas.

## 4. WhatsApp (Meta)

1. Webhook: `https://<dominio>/api/webhooks/whatsapp`, verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, assine o campo **messages**.
2. Use token de **System User** permanente.
3. Siga o roteiro de validação em [STATUS.md](STATUS.md) com o **modo de teste ligado**.

## 5. Monitoramento

* Painel → **Monitoramento**: fila, tarefas travadas/atrasadas, falhas, último batimento da rotina e do webhook.
* Monitor externo (UptimeRobot, Better Stack, etc.) a cada 5 min:
  `GET https://<dominio>/api/health?deep=1` com cabeçalho `Authorization: Bearer <HEALTHCHECK_TOKEN>` → **200** ok, **503** degradado/indisponível.
* Notificações no painel: tarefas com falha definitiva, limites diários atingidos, atendimento humano, oportunidades, reuniões, descadastros.
* Logs: Vercel (painel/webhook) e Supabase → Edge Functions → `agent-runner` (JSON estruturado).

## 6. Ativação das rotinas

Somente depois de validar descoberta, WhatsApp e IA:

1. No SQL Editor, crie os segredos no Vault e agende (ver `supabase/sql/activate_cron.sql`).
2. Rode `supabase/sql/verify_setup.sql` — todos os itens devem estar ✔ (o item 10 só fica ✔ depois da primeira execução em horário comercial).
3. No painel, **Configurações → Automação**: habilite o Google Places (ciente do custo) e o **piloto automático**.
4. Na manhã seguinte (dia útil), confira **Campanhas** (etapas 08:00–12:00) e **Relatórios** (12:00).

## 7. Operação e emergência

| Situação | Ação |
|---|---|
| Comportamento inesperado do agente | **Parada de emergência** (topo do painel): pausa tudo e cancela a fila. Só admin retoma. |
| Desligar só as rotinas | `supabase/sql/deactivate_cron.sql` |
| Desligar só a IA | Configurações → IA → desmarcar respostas automáticas |
| Vazamento de chave | Revogue no provedor, gere nova, atualize Vercel/`supabase secrets`, redeploy |
| Restaurar dados | Point-in-Time Recovery do Supabase |

## 8. Checklist de go-live

- [ ] `npm run test:all` verde e CI verde
- [ ] `npm run check:env:prod` sem erros
- [ ] `verify_setup.sql` todo ✔
- [ ] Política de privacidade revisada (jurídico) e dados do controlador preenchidos
- [ ] Oferta, prazo, pagamento e base de conhecimento revisados; portfólio só com autorização
- [ ] Simulador testado com as objeções principais
- [ ] Fluxo real com número de teste: receber, responder, status, PARAR, pedido de humano, reunião, oportunidade
- [ ] Monitor externo configurado
- [ ] Modo de teste do WhatsApp desligado **por último**
