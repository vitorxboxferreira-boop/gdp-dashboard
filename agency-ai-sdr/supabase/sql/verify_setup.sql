-- =============================================================================
-- Verificação do ambiente (executar no SQL Editor do projeto de PRODUÇÃO
-- antes e depois de ativar as rotinas). Somente leitura.
-- =============================================================================
with checks as (
  select 1 as ord, 'Migrations aplicadas (tabelas principais)' as item,
         (select count(*) from information_schema.tables where table_schema = 'public'
           and table_name in ('companies','leads','consents','conversations','messages','appointments','sales','campaigns',
                              'agent_settings','daily_reports','audit_logs','suppression_list','profiles','knowledge_base',
                              'notifications','whatsapp_templates','system_heartbeats','jobs')) = 18 as ok,
         null::text as detail
  union all
  select 2, 'RLS habilitado em todas as tabelas',
         not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), null
  union all
  select 3, 'Pelo menos um administrador', exists (select 1 from public.profiles where role = 'admin'), null
  union all
  select 4, 'Dados demonstrativos removidos (recomendado em produção)', not exists (select 1 from public.companies where is_demo),
         (select count(*)::text || ' registros demo' from public.companies where is_demo)
  union all
  select 5, 'Extensão pg_cron', exists (select 1 from pg_extension where extname = 'pg_cron'), null
  union all
  select 6, 'Extensão pg_net', exists (select 1 from pg_extension where extname = 'pg_net'), null
  union all
  select 7, 'Segredos no Vault (agent_runner_url / agent_runner_secret)',
         (select count(*) from vault.secrets where name in ('agent_runner_url', 'agent_runner_secret')) = 2, null
  union all
  select 8, 'Rotina agent-runner agendada', exists (select 1 from cron.job where jobname = 'agency-sdr-agent-runner' and active), null
  union all
  select 9, 'Rotina de retenção agendada', exists (select 1 from cron.job where jobname = 'agency-sdr-retention' and active), null
  union all
  select 10, 'Rotina executou nos últimos 30 min (em horário comercial)',
         exists (select 1 from public.system_heartbeats where component = 'agent_runner' and last_seen > now() - interval '30 minutes'),
         (select 'último: ' || to_char(last_seen at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') from public.system_heartbeats where component = 'agent_runner')
  union all
  select 11, 'Modo de teste do WhatsApp (deve estar LIGADO até validar)', (select whatsapp_test_mode from public.agent_settings), null
  union all
  select 12, 'Automações não pausadas', not (select automation_paused from public.agent_settings), (select paused_reason from public.agent_settings)
  union all
  select 13, 'Saúde do sistema', (public.system_health() ->> 'status') = 'ok', (public.system_health() ->> 'issues')
)
select ord, item, case when ok then '✔' else '✖' end as resultado, detail from checks order by ord;
