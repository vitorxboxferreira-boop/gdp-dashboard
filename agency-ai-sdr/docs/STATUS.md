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

## Próximas fases

* **Fase 2** — WhatsApp Cloud API: webhook (verificação + HMAC), recebimento idempotente, histórico de conversas em tempo real (Supabase Realtime), assumir conversa/pausar agente, descadastro por palavra-chave, gate de envio (autorização + janela 24 h/template + limites + qualidade). Envios reais somente após testes com número de teste da Meta.
* **Fase 3** — IA (Anthropic): agentes SDR e Closer, base de conhecimento, negociação dentro dos limites da oferta, controle de tokens/custos, identificação como assistente virtual, transferência para humano.
* **Fase 4** — Agenda, aprovação de vendas, relatórios completos, notificações.
* **Fase 5** — Revisão de segurança, testes E2E com Supabase real, monitoramento, deploy e ativação das rotinas.
