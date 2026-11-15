-- Testes de idempotência, fila, integridade e retenção
\set ON_ERROR_STOP 1
begin;
do $$
declare
  v_job uuid; n int; v_status text; v_c uuid; v_conv uuid;
begin
  -- Idempotência de jobs
  insert into public.jobs (kind, idempotency_key) values ('scout.search', '2026-11-16:scout') returning id into v_job;
  begin
    insert into public.jobs (kind, idempotency_key) values ('scout.search', '2026-11-16:scout');
    raise exception 'FALHA: job duplicado aceito';
  exception when unique_violation then null;
  end;

  -- Reserva exclusiva
  select count(*) into n from public.claim_jobs('worker-a', 5, 600);
  if n <> 1 then raise exception 'FALHA: claim deveria retornar 1 (%).', n; end if;
  select count(*) into n from public.claim_jobs('worker-b', 5, 600);
  if n <> 0 then raise exception 'FALHA: job reservado duas vezes'; end if;

  -- Falha com backoff
  v_status := public.fail_job(v_job, 'erro temporário');
  if v_status <> 'queued' then raise exception 'FALHA: deveria voltar à fila'; end if;
  if (select run_after from public.jobs where id = v_job) <= now() then raise exception 'FALHA: sem backoff'; end if;

  -- Esgotar tentativas -> dead
  update public.jobs set attempts = max_attempts, status = 'running' where id = v_job;
  v_status := public.fail_job(v_job, 'erro final');
  if v_status <> 'dead' then raise exception 'FALHA: deveria virar dead (%).', v_status; end if;

  -- Recuperação de lock expirado
  insert into public.jobs (kind, idempotency_key, status, attempts, locked_at)
  values ('analyst.score', 'stale-lock', 'running', 1, now() - interval '1 hour') returning id into v_job;
  perform public.claim_jobs('worker-c', 5, 600);
  if (select locked_by from public.jobs where id = v_job) <> 'worker-c' then
    raise exception 'FALHA: job travado não foi recuperado';
  end if;

  -- Parada de emergência cancela fila
  insert into public.jobs (kind, idempotency_key) values ('report.prepare', 'to-cancel');
  perform public.set_automation_paused(true, 'teste');
  if (select status from public.jobs where idempotency_key = 'to-cancel') <> 'cancelled' then
    raise exception 'FALHA: parada de emergência não cancelou job';
  end if;
  if not exists (select 1 from public.audit_logs where action = 'automation.paused') then
    raise exception 'FALHA: parada não auditada';
  end if;

  -- Uma campanha automática por dia
  insert into public.campaigns (campaign_date, trigger) values ('2026-11-16', 'cron');
  begin
    insert into public.campaigns (campaign_date, trigger) values ('2026-11-16', 'cron');
    raise exception 'FALHA: campanha duplicada aceita';
  exception when unique_violation then null;
  end;
  insert into public.campaigns (campaign_date, trigger) values ('2026-11-16', 'manual');

  -- Deduplicação de empresas (place_id e nome normalizado + cidade + telefone)
  insert into public.companies (source, name, city, phone_e164, place_id)
  values ('google_places', 'Padaria São João', 'Livramento', '+555532420000', 'p1') returning id into v_c;
  begin
    insert into public.companies (source, name, place_id) values ('google_places', 'Outra', 'p1');
    raise exception 'FALHA: place_id duplicado aceito';
  exception when unique_violation then null;
  end;
  begin
    insert into public.companies (source, name, city, phone_e164) values ('manual', '  PADARIA sao joão!! ', 'Livramento', '+555532420000');
    raise exception 'FALHA: duplicata por nome normalizado aceita';
  exception when unique_violation then null;
  end;

  -- Auditoria registra apenas colunas alteradas
  update public.companies set website_status = 'verified_none' where id = v_c;
  if (select new_data from public.audit_logs where entity = 'companies' and entity_id = v_c::text order by id desc limit 1)
       ?| array['name', 'city'] then
    raise exception 'FALHA: auditoria registrou colunas não alteradas';
  end if;
  if (select website_verified_at from public.companies where id = v_c) is null then
    raise exception 'FALHA: verificação de site sem data';
  end if;

  -- Idempotência de webhooks e mensagens
  insert into public.processed_events (source, event_id) values ('whatsapp', 'wamid.1');
  begin
    insert into public.processed_events (source, event_id) values ('whatsapp', 'wamid.1');
    raise exception 'FALHA: evento duplicado aceito';
  exception when unique_violation then null;
  end;
  insert into public.conversations (phone_e164) values ('+555599990000') returning id into v_conv;
  insert into public.messages (conversation_id, direction, sender, body, wa_message_id, status)
  values (v_conv, 'inbound', 'cliente', 'oi', 'wamid.X', 'recebida');
  begin
    insert into public.messages (conversation_id, direction, sender, body, wa_message_id, status)
    values (v_conv, 'inbound', 'cliente', 'oi', 'wamid.X', 'recebida');
    raise exception 'FALHA: mensagem duplicada aceita';
  exception when unique_violation then null;
  end;

  -- Reuniões confirmadas não se sobrepõem
  insert into public.appointments (contact_name, starts_at, ends_at, status)
  values ('A', '2026-11-17 14:00-03', '2026-11-17 14:30-03', 'confirmada');
  insert into public.appointments (contact_name, starts_at, ends_at, status)
  values ('B', '2026-11-17 14:15-03', '2026-11-17 14:45-03', 'proposta');
  begin
    insert into public.appointments (contact_name, starts_at, ends_at, status)
    values ('C', '2026-11-17 14:15-03', '2026-11-17 14:45-03', 'confirmada');
    raise exception 'FALHA: reuniões sobrepostas confirmadas';
  exception when exclusion_violation then null;
  end;

  -- Vendas exigem aprovação humana
  begin
    insert into public.sales (description, amount_cents, status) values ('Site', 25000, 'aprovada');
    raise exception 'FALHA: venda aprovada sem aprovador';
  exception when check_violation then null;
  end;

  -- Retenção: conteúdo do Places expira, place_id permanece
  update public.companies set places_data_expires_at = now() - interval '1 day' where id = v_c;
  perform public.purge_expired_data();
  if (select phone_e164 from public.companies where id = v_c) is not null
     or (select place_id from public.companies where id = v_c) <> 'p1' then
    raise exception 'FALHA: retenção do Places incorreta';
  end if;

  -- Métricas do painel (executadas como sistema)
  if (public.dashboard_metrics() ->> 'demo_companies')::int <> 5 then
    raise exception 'FALHA: dashboard_metrics demo_companies';
  end if;
end $$;
rollback;
\echo '  ✔ integridade ok'
