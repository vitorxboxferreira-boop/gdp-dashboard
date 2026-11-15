# Status por fase

## Fase 1 — concluída (esta entrega)

| Item | Situação | Como foi verificado |
|---|---|---|
| Estrutura do projeto (Next.js 16, TS, Tailwind 4) | ✅ | `npm run build`, `npm run typecheck` |
| Banco: 5 migrations, 18 tabelas, índices, unicidade, RLS, auditoria, fila, retenção | ✅ | `npm run test:db` em PostgreSQL 16 (4 suítes) |
| Autenticação (Supabase Auth, papéis, proxy) | ✅ código / ⚠️ fluxo de login | Redirecionamentos testados com Playwright; login real **não** testado (sem projeto Supabase no ambiente de desenvolvimento) |
| Painel (visão geral, empresas, leads, campanhas, agentes, custos, relatórios, configurações) | ✅ código / ⚠️ renderização autenticada | Build OK; páginas autenticadas não renderizadas contra um Supabase real |
| Cadastro manual, verificação de site, autorizações, bloqueio | ✅ | Regras validadas no banco (testes SQL) |
| Agente Scout (Google Places) | ✅ código / ⚠️ API real | Testes com respostas simuladas (limites, paginação, deduplicação, erros, pausa). **Não testado contra a API real** |
| Agente Analyst | ✅ | Testes unitários |
| Orquestrador / fila / campanha diária | ✅ | Testes do pipeline com relógio simulado + testes SQL da fila |
| Edge Function `agent-runner` | ✅ código / ⚠️ deploy | `deno check` OK; não publicada |
| Parada de emergência | ✅ | Testes SQL e de pipeline |
| Controle de custos (registro + limites) | ✅ | Testes |

## Pendências para colocar a Fase 1 em produção

1. Criar projetos Supabase de desenvolvimento e produção; `supabase db push`.
2. Criar o primeiro admin (`grant_role`).
3. Configurar variáveis na Vercel (Root Directory `agency-ai-sdr`).
4. Gerar chave da Places API (New), habilitar no painel e executar uma pesquisa real **com limite baixo** para validar a integração.
5. Revisar a política de privacidade com assessoria jurídica e preencher os dados do controlador.
6. Cadastrar feriados municipais.

## Fase 2 — concluída (WhatsApp Cloud API)

| Item | Situação | Como foi verificado |
|---|---|---|
| Webhook GET (verificação) e POST (HMAC `X-Hub-Signature-256`) | ✅ | Testes unitários + requisições reais ao servidor Next.js (200/403/401/500) |
| Recebimento idempotente, janela de 24h, vínculo com empresa/lead | ✅ | Testes SQL + teste de integração webhook → PostgreSQL (como `service_role`) |
| Status de entrega (não regride) | ✅ | Testes SQL e de integração |
| Descadastro imediato e pedido de atendimento humano | ✅ | Testes unitários (sem falsos positivos comuns), SQL e integração |
| Histórico e tempo real (Supabase Realtime + RLS) | ✅ código / ⚠️ | Build OK; tempo real não exercitado sem projeto Supabase |
| Assumir conversa / devolver ao agente / encerrar / bloquear | ✅ | Proteções no banco testadas (operador não altera janela nem grava mensagem direto) |
| Envio manual dentro da janela, com modo de teste e limites | ✅ código / ⚠️ API real | Requisição oficial testada com respostas simuladas; **não testado contra a Meta** |
| Templates / mensagens iniciadas pela empresa | ❌ não implementado | Bloqueado no banco |

### Validação com a Meta (antes de produção)

1. Crie o app (tipo Business) no Meta for Developers e adicione o produto WhatsApp; use o **número de teste** fornecido.
2. Gere um token de **System User** permanente com `whatsapp_business_messaging` e `whatsapp_business_management` (não use o token temporário de 24h em produção).
3. Preencha `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` na Vercel.
4. Registre o webhook (URL em Configurações → WhatsApp) e assine o campo `messages`.
5. Em Configurações → WhatsApp: habilite, mantenha o **modo de teste** e cadastre seu número pessoal na lista.
6. Envie uma mensagem do seu celular ao número de teste → confira a conversa no painel → responda pelo painel → confira status ✓/✓✓/lida → envie "PARAR" e confirme o bloqueio.
7. Só então desligue o modo de teste (digitando PRODUCAO).

## Fase 3 — concluída (agentes de IA)

| Item | Situação | Como foi verificado |
|---|---|---|
| Agentes SDR e Closer (SDK oficial `@anthropic-ai/sdk`, saída estruturada, fallback de recusa, cache de prompt) | ✅ código / ⚠️ API real | Requisição montada pelo SDK verificada com `fetch` interceptado; **não testado contra a API da Anthropic** (sem chave / sem autorização de gasto) |
| Travas no código (preço, desconto, promessas, confirmação de pagamento/contrato/reunião, fingir ser humano, identificação na 1ª mensagem, tamanho) | ✅ | Testes unitários |
| Fluxo completo (agrupamento, já respondida, horário, verificação de envio antes da IA, limites de tokens e de respostas, transferência, oportunidade, descadastro, reenvio idempotente) | ✅ | Testes com IA e WhatsApp simulados |
| Fila `sdr.reply`, decisões, oportunidades pendentes de aprovação, papel SDR→Closer | ✅ | Testes SQL |
| Base de conhecimento editável (portfólio só com autorização registrada) | ✅ | Restrição no banco testada |
| Simulador no painel (não envia nada; registra custo) | ✅ código / ⚠️ | Depende da chave da Anthropic |
| Edge Function com IA (fallback pelo Cron) | ✅ código | `deno check` OK (SDK via import map) |

### Validação recomendada (antes de ligar para clientes reais)

1. Defina `ANTHROPIC_API_KEY` (Vercel e `supabase secrets`) e configure nome da agência, oferta, prazo e pagamento.
2. Em **Agentes → Simulador**, teste: saudação, “quanto custa?”, “está caro”, “já tenho Instagram”, “quero ver exemplos”, “é robô?”, “quero contratar”, tentativas de pedir desconto e “domínio grátis?”.
3. Com o WhatsApp em **modo de teste**, ligue a IA e converse pelo seu celular.
4. Acompanhe custos em **Custos e limites**; ajuste o limite diário de tokens.
5. Só depois desligue o modo de teste do WhatsApp.

## Próximas fases

* **Fase 4** — Agenda, aprovação de vendas, relatórios completos, notificações.
* **Fase 5** — Revisão de segurança, testes E2E com Supabase real, monitoramento, deploy e ativação das rotinas.
