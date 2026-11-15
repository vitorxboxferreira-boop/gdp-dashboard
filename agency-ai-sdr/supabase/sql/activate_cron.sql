-- =============================================================================
-- ATIVAÇÃO DAS ROTINAS (Fase 5) — executar manualmente no SQL Editor do Supabase
-- somente após validar a Fase 1 e configurar os segredos.
--
-- Pré-requisitos:
--   1. Extensões pg_cron e pg_net habilitadas (Database → Extensions).
--   2. Edge Function "agent-runner" publicada:  supabase functions deploy agent-runner
--   3. Segredos da função:                       supabase secrets set CRON_SECRET=... GOOGLE_PLACES_API_KEY=...
--   4. Os mesmos valores de URL e CRON_SECRET salvos no Vault (abaixo), nunca em texto no job.
--
-- Horários: pg_cron usa UTC. America/Sao_Paulo = UTC−3 (sem horário de verão desde 2019).
--   Campanha às 08:00 local = 11:00 UTC. O runner roda a cada 5 min de 11:00 a 15:55 UTC
--   (08:00–12:55 local), seg–sex. O próprio runner também verifica dia útil/feriado no fuso local.
-- =============================================================================

-- 1) Segredos no Vault (substitua os valores; execute uma vez)
-- select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/agent-runner', 'agent_runner_url');
-- select vault.create_secret('<MESMO_VALOR_DE_CRON_SECRET>', 'agent_runner_secret');

-- 2) Agendamento
select cron.schedule(
  'agency-sdr-agent-runner',
  '*/5 11-15 * * 1-5',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'agent_runner_url'),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'agent_runner_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

-- 3) Retenção de dados (diariamente às 03:30 local = 06:30 UTC)
select cron.schedule('agency-sdr-retention', '30 6 * * *', $$ select public.purge_expired_data(); $$);

-- Para desativar:
-- select cron.unschedule('agency-sdr-agent-runner');
-- select cron.unschedule('agency-sdr-retention');
