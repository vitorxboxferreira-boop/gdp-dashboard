-- =============================================================================
-- Agency AI SDR — 0009 Fase 5: endurecimento e monitoramento
-- =============================================================================

-- -----------------------------------------------------------------------------
-- URLs: somente http(s) (impede "javascript:" e similares mesmo fora do painel)
-- -----------------------------------------------------------------------------
update public.companies set website_uri = null where website_uri is not null and website_uri !~* '^https?://';
update public.companies set google_maps_uri = null where google_maps_uri is not null and google_maps_uri !~* '^https?://';
alter table public.companies
  add constraint companies_website_uri_http_ck check (website_uri is null or website_uri ~* '^https?://'),
  add constraint companies_maps_uri_http_ck check (google_maps_uri is null or google_maps_uri ~* '^https?://');
alter table public.knowledge_base
  add constraint knowledge_base_url_http_ck check (url is null or url ~* '^https?://');
alter table public.notifications
  add constraint notifications_link_internal_ck check (link is null or link ~ '^/([^/\\].*)?$');

-- -----------------------------------------------------------------------------
-- Batimentos (heartbeats) para monitoramento
-- -----------------------------------------------------------------------------
create table public.system_heartbeats (
  component   text primary key check (component in ('agent_runner', 'whatsapp_webhook', 'panel_agents')),
  last_seen   timestamptz not null default now(),
  last_ok     boolean not null default true,
  details     jsonb not null default '{}'::jsonb
);
alter table public.system_heartbeats enable row level security;
create policy system_heartbeats_select on public.system_heartbeats for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.system_heartbeats from authenticated;

create or replace function public.record_heartbeat(p_component text, p_ok boolean, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.system_heartbeats (component, last_seen, last_ok, details)
  values (p_component, now(), p_ok, coalesce(p_details, '{}'::jsonb))
  on conflict (component) do update set last_seen = now(), last_ok = excluded.last_ok, details = excluded.details;
$$;
revoke execute on function public.record_heartbeat(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.record_heartbeat(text, boolean, jsonb) to service_role;

-- Estado do sistema para o painel e para a verificação de saúde externa.
create or replace function public.system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.agent_settings%rowtype;
  v_local timestamp := now() at time zone 'America/Sao_Paulo';
  v_business boolean;
  v_runner timestamptz;
  v_issues text[] := '{}';
  v_stuck integer;
  v_dead integer;
  v_queued_old integer;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into s from public.agent_settings where id = 1;
  select last_seen into v_runner from public.system_heartbeats where component = 'agent_runner';
  v_business := extract(isodow from v_local) between 1 and 5 and v_local::time between '08:05' and '18:55';

  select count(*) into v_stuck from public.jobs where status = 'running' and locked_at < now() - interval '15 minutes';
  select count(*) into v_dead from public.jobs where status = 'dead' and finished_at > now() - interval '24 hours';
  select count(*) into v_queued_old from public.jobs where status = 'queued' and run_after < now() - interval '30 minutes';

  if s.autopilot_enabled and not s.automation_paused and v_business
     and (v_runner is null or v_runner < now() - interval '15 minutes') then
    v_issues := array_append(v_issues, 'Rotina agendada (agent-runner) sem execução há mais de 15 minutos em horário comercial');
  end if;
  if v_stuck > 0 then v_issues := array_append(v_issues, format('%s tarefa(s) travada(s) em execução', v_stuck)); end if;
  if v_queued_old > 0 then v_issues := array_append(v_issues, format('%s tarefa(s) atrasada(s) na fila', v_queued_old)); end if;
  if v_dead > 0 then v_issues := array_append(v_issues, format('%s tarefa(s) com falha definitiva nas últimas 24h', v_dead)); end if;

  return jsonb_build_object(
    'status', case when cardinality(v_issues) = 0 then 'ok' else 'degraded' end,
    'issues', to_jsonb(v_issues),
    'automation_paused', s.automation_paused,
    'autopilot_enabled', s.autopilot_enabled,
    'heartbeats', coalesce((select jsonb_object_agg(component, jsonb_build_object('last_seen', last_seen, 'ok', last_ok, 'details', details)) from public.system_heartbeats), '{}'::jsonb),
    'queue', jsonb_build_object(
      'queued', (select count(*) from public.jobs where status = 'queued'),
      'running', (select count(*) from public.jobs where status = 'running'),
      'stuck', v_stuck, 'late', v_queued_old, 'dead_24h', v_dead),
    'failures_24h', jsonb_build_object(
      'google_places', (select count(*) from public.usage_events where provider = 'google_places' and not success and occurred_at > now() - interval '24 hours'),
      'anthropic', (select count(*) from public.usage_events where provider = 'anthropic' and not success and occurred_at > now() - interval '24 hours'),
      'whatsapp', (select count(*) from public.messages where direction = 'outbound' and status = 'falhou' and created_at > now() - interval '24 hours')),
    'last_inbound_message', (select max(created_at) from public.messages where direction = 'inbound'),
    'checked_at', now());
end;
$$;
revoke execute on function public.system_health() from public, anon;
grant execute on function public.system_health() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Retenção: inclui notificações lidas e batimentos/tarefas antigos
-- -----------------------------------------------------------------------------
create or replace function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.agent_settings%rowtype;
  v_msgs integer; v_places integer; v_usage integer; v_events integer; v_notif integer; v_jobs integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into s from public.agent_settings where id = 1;

  delete from public.messages where created_at < now() - make_interval(days => s.data_retention_days);
  get diagnostics v_msgs = row_count;

  update public.companies c
     set formatted_address = null, latitude = null, longitude = null,
         phone_national = null, phone_e164 = null, website_uri = null,
         rating = null, user_rating_count = null, google_maps_uri = null,
         business_status = null, places_data_expires_at = null,
         notes = coalesce(c.notes || E'\n', '') || 'Dados do Google Places expirados em ' || to_char(now(), 'DD/MM/YYYY')
   where c.source = 'google_places'
     and c.places_data_expires_at < now()
     and not exists (select 1 from public.consents k where k.company_id = c.id and k.revoked_at is null)
     and not exists (select 1 from public.conversations v where v.company_id = c.id);
  get diagnostics v_places = row_count;

  delete from public.usage_events where occurred_at < now() - interval '400 days';
  get diagnostics v_usage = row_count;
  delete from public.processed_events where received_at < now() - interval '30 days';
  get diagnostics v_events = row_count;
  delete from public.notifications where read_at is not null and read_at < now() - interval '90 days';
  get diagnostics v_notif = row_count;
  delete from public.jobs where status in ('done', 'cancelled') and finished_at < now() - interval '90 days';
  get diagnostics v_jobs = row_count;

  return jsonb_build_object('messages', v_msgs, 'places_content', v_places, 'usage_events', v_usage,
                            'processed_events', v_events, 'notifications', v_notif, 'jobs', v_jobs);
end;
$$;

-- Alerta quando limites diários são atingidos (uma vez por dia por tipo).
create or replace function public.notify_limit_once(p_key text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.processed_events (source, event_id)
  values ('limit_alert', p_key || ':' || ((now() at time zone 'America/Sao_Paulo')::date)::text)
  on conflict (source, event_id) do nothing;
  if found then
    perform public.notify('limite', p_title, p_body, '/custos');
  end if;
end;
$$;
revoke execute on function public.notify_limit_once(text, text, text) from public, anon, authenticated;
grant execute on function public.notify_limit_once(text, text, text) to service_role;
