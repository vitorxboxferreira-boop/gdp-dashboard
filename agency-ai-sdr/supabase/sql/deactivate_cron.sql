-- Desativa as rotinas agendadas (o painel continua funcionando).
-- Para interromper imediatamente também as tarefas na fila, use a parada de emergência do painel.
select cron.unschedule('agency-sdr-agent-runner') where exists (select 1 from cron.job where jobname = 'agency-sdr-agent-runner');
select cron.unschedule('agency-sdr-retention') where exists (select 1 from cron.job where jobname = 'agency-sdr-retention');
