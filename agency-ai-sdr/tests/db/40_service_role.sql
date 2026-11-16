-- Fluxo do agente executado como service_role (como a Edge Function / servidor faz via PostgREST)
\set ON_ERROR_STOP 1
begin;
set local role service_role;
do $$
declare
  v_c uuid; v_job record; n int; r jsonb;
begin
  -- Scout: inserção de empresa vinda do Places + consumo
  insert into public.companies (source, place_id, name, city, state, phone_e164, website_status, business_status, user_rating_count, places_data_expires_at)
  values ('google_places', 'ChIJ_svc_1', 'Barbearia Teste', 'Sant''Ana do Livramento', 'RS', '+5555999990001', 'not_identified', 'OPERATIONAL', 30, now() + interval '30 days')
  returning id into v_c;
  insert into public.usage_events (provider, operation, estimated_cost_usd) values ('google_places', 'places.searchText', 0.035);

  -- Analyst: empresas pendentes (inclui 5 demo + 1 nova)
  select count(*) into n from public.companies_pending_scoring(100);
  if n <> 6 then raise exception 'FALHA: pending_scoring esperado 6, obtido %', n; end if;

  -- Upsert de pontuação (equivalente ao upsert on_conflict=company_id do PostgREST)
  insert into public.leads (company_id, score, priority, score_reasons, score_version, scored_at)
  values (v_c, 85, 'alta', '{"reasons":[]}', 'analyst-v1', now())
  on conflict (company_id) do update set score = excluded.score, priority = excluded.priority, scored_at = excluded.scored_at;
  insert into public.leads (company_id, score, priority, score_reasons, score_version, scored_at)
  values (v_c, 86, 'alta', '{"reasons":[]}', 'analyst-v1', now())
  on conflict (company_id) do update set score = excluded.score, priority = excluded.priority, scored_at = excluded.scored_at;
  if (select score from public.leads where company_id = v_c) <> 86 then raise exception 'FALHA: upsert de lead'; end if;

  select count(*) into n from public.companies_pending_scoring(100) where id = v_c;
  if n <> 0 then raise exception 'FALHA: empresa pontuada continua pendente'; end if;

  -- Classificação e elegibilidade
  r := public.classify_leads();
  if (r ->> 'qualified')::int <> 1 then raise exception 'FALHA: classify_leads %', r; end if;
  r := public.refresh_all_lead_eligibility();
  if (r ->> 'nao_contatavel')::int <> 1 then raise exception 'FALHA: elegibilidade %', r; end if;

  -- Fila
  insert into public.campaigns (campaign_date, trigger) values (current_date, 'manual');
  insert into public.jobs (kind, idempotency_key) values ('scout.search', 'svc-test') on conflict (idempotency_key) do nothing;
  insert into public.jobs (kind, idempotency_key) values ('scout.search', 'svc-test') on conflict (idempotency_key) do nothing;
  select * into v_job from public.claim_jobs('svc', 1, 600);
  perform public.complete_job(v_job.id, '{"ok":true}');
  if (select status from public.jobs where id = v_job.id) <> 'done' then raise exception 'FALHA: complete_job'; end if;

  -- Métricas e relatório
  r := public.dashboard_metrics();
  if (r ->> 'companies_today')::int <> 1 or (r ->> 'qualified_leads')::int <> 1 or (r ->> 'places_requests_today')::int <> 1 then
    raise exception 'FALHA: dashboard_metrics %', r;
  end if;
  insert into public.daily_reports (report_date, status, metrics) values (current_date, 'preparando', r)
  on conflict (report_date) do update set status = 'disponivel';
end $$;
rollback;
\echo '  ✔ fluxo service_role ok'
