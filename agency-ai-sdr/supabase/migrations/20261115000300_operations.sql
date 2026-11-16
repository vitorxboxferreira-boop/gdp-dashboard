-- =============================================================================
-- Agency AI SDR — 0003 Operações
-- Campanhas, fila de tarefas, consumo/custos, relatórios, idempotência,
-- conversas, mensagens, reuniões e vendas.
-- (Conversas/mensagens/reuniões/vendas são usadas a partir das Fases 2–4;
--  as tabelas já existem para manter o modelo de dados consistente.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Campanhas diárias
-- -----------------------------------------------------------------------------
create table public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  campaign_date  date not null,
  kind           text not null default 'daily_prospecting',
  trigger        text not null default 'cron' check (trigger in ('cron', 'manual')),
  status         text not null default 'agendada'
                 check (status in ('agendada', 'em_execucao', 'concluida', 'falhou', 'cancelada')),
  search_area_id uuid references public.search_areas (id) on delete set null,
  stats          jsonb not null default '{}'::jsonb,
  error          text,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Idempotência: no máximo uma campanha automática por dia e tipo.
create unique index campaigns_cron_daily_uidx
  on public.campaigns (campaign_date, kind) where trigger = 'cron';
create index campaigns_date_idx on public.campaigns (campaign_date desc);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.companies add column campaign_id uuid references public.campaigns (id) on delete set null;
create index companies_campaign_idx on public.companies (campaign_id);

-- -----------------------------------------------------------------------------
-- Fila de tarefas (pequenas, com tentativas controladas e recuperação de falhas)
-- -----------------------------------------------------------------------------
create table public.jobs (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in (
                     'campaign.start', 'scout.search', 'analyst.score',
                     'leads.classify', 'eligibility.check',
                     'report.prepare', 'report.publish', 'maintenance.retention')),
  payload          jsonb not null default '{}'::jsonb,
  campaign_id      uuid references public.campaigns (id) on delete cascade,
  status           text not null default 'queued'
                   check (status in ('queued', 'running', 'done', 'failed', 'dead', 'cancelled')),
  attempts         integer not null default 0,
  max_attempts     integer not null default 5 check (max_attempts between 1 and 20),
  run_after        timestamptz not null default now(),
  locked_at        timestamptz,
  locked_by        text,
  last_error       text,
  result           jsonb,
  idempotency_key  text not null unique,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);

create index jobs_ready_idx on public.jobs (run_after) where status = 'queued';
create index jobs_campaign_idx on public.jobs (campaign_id);

-- Reserva atômica de tarefas prontas (FOR UPDATE SKIP LOCKED) e recuperação
-- de tarefas travadas (worker caiu no meio da execução).
create or replace function public.claim_jobs(p_worker text, p_limit integer default 5, p_lock_timeout_seconds integer default 600)
returns setof public.jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.jobs
     set status = case when attempts >= max_attempts then 'dead' else 'queued' end,
         locked_at = null, locked_by = null,
         last_error = coalesce(last_error, '') || ' [lock expirado]'
   where status = 'running'
     and locked_at < now() - make_interval(secs => p_lock_timeout_seconds);

  return query
  update public.jobs j
     set status = 'running',
         attempts = j.attempts + 1,
         locked_at = now(),
         locked_by = p_worker
   where j.id in (
     select id from public.jobs
      where status = 'queued' and run_after <= now()
      order by run_after, created_at
      for update skip locked
      limit greatest(1, least(p_limit, 50)))
  returning j.*;
end;
$$;

create or replace function public.complete_job(p_job_id uuid, p_result jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jobs
     set status = 'done', result = p_result, finished_at = now(), locked_at = null, last_error = null
   where id = p_job_id and status = 'running';
$$;

-- Falha com backoff exponencial (30s, 60s, 120s, ... máx. 30 min).
create or replace function public.fail_job(p_job_id uuid, p_error text, p_retry boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  update public.jobs
     set status = case when not p_retry or attempts >= max_attempts then 'dead' else 'queued' end,
         last_error = left(p_error, 2000),
         run_after = now() + make_interval(secs => least(1800, 30 * power(2, greatest(attempts - 1, 0))::int)),
         locked_at = null,
         locked_by = null,
         finished_at = case when not p_retry or attempts >= max_attempts then now() else null end
   where id = p_job_id
  returning status into v_status;
  return v_status;
end;
$$;

-- Reagendar sem consumir tentativa (ex.: aguardando etapa anterior).
create or replace function public.defer_job(p_job_id uuid, p_seconds integer, p_note text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jobs
     set status = 'queued',
         attempts = greatest(attempts - 1, 0),
         run_after = now() + make_interval(secs => greatest(p_seconds, 1)),
         locked_at = null, locked_by = null,
         last_error = p_note
   where id = p_job_id;
$$;

-- -----------------------------------------------------------------------------
-- Consumo e custos estimados
-- -----------------------------------------------------------------------------
create table public.usage_events (
  id                  bigint generated always as identity primary key,
  occurred_at         timestamptz not null default now(),
  usage_date          date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  provider            text not null check (provider in ('google_places', 'anthropic', 'whatsapp')),
  operation           text not null,
  units               integer not null default 1 check (units >= 0),
  input_tokens        integer not null default 0 check (input_tokens >= 0),
  output_tokens       integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd  numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0),
  success             boolean not null default true,
  campaign_id         uuid references public.campaigns (id) on delete set null,
  job_id              uuid references public.jobs (id) on delete set null,
  metadata            jsonb not null default '{}'::jsonb
);

create index usage_events_provider_date_idx on public.usage_events (provider, usage_date);

create or replace view public.usage_daily
with (security_invoker = true)
as
select usage_date,
       provider,
       count(*)                       as calls,
       sum(units)                     as units,
       sum(input_tokens)              as input_tokens,
       sum(output_tokens)             as output_tokens,
       sum(estimated_cost_usd)        as estimated_cost_usd,
       count(*) filter (where not success) as failures
  from public.usage_events
 group by usage_date, provider;

-- -----------------------------------------------------------------------------
-- Relatórios diários
-- -----------------------------------------------------------------------------
create table public.daily_reports (
  id            uuid primary key default gen_random_uuid(),
  report_date   date not null unique,
  campaign_id   uuid references public.campaigns (id) on delete set null,
  status        text not null default 'preparando' check (status in ('preparando', 'disponivel')),
  metrics       jsonb not null default '{}'::jsonb,
  summary       text,
  generated_at  timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Idempotência de eventos externos (webhooks)
-- -----------------------------------------------------------------------------
create table public.processed_events (
  id           bigint generated always as identity primary key,
  source       text not null,
  event_id     text not null,
  received_at  timestamptz not null default now(),
  payload_hash text,
  unique (source, event_id)
);

-- -----------------------------------------------------------------------------
-- Conversas e mensagens (Fase 2)
-- -----------------------------------------------------------------------------
create table public.conversations (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 uuid references public.companies (id) on delete set null,
  lead_id                    uuid references public.leads (id) on delete set null,
  phone_e164                 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  contact_name               text,
  status                     text not null default 'aberta'
                             check (status in ('aberta', 'aguardando_cliente', 'humano', 'encerrada')),
  handled_by                 text not null default 'agente' check (handled_by in ('agente', 'humano')),
  agent_paused               boolean not null default false,
  assigned_to                uuid references auth.users (id) on delete set null,
  last_inbound_at            timestamptz,
  last_outbound_at           timestamptz,
  service_window_expires_at  timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create unique index conversations_open_phone_uidx
  on public.conversations (phone_e164) where status <> 'encerrada';
create index conversations_lead_idx on public.conversations (lead_id);
create index conversations_updated_idx on public.conversations (updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create trigger conversations_audit
  after update on public.conversations
  for each row execute function public.audit_row_change();

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  direction        text not null check (direction in ('inbound', 'outbound')),
  sender           text not null check (sender in ('cliente', 'agente', 'humano', 'sistema')),
  message_type     text not null default 'text',
  body             text,
  template_name    text,
  wa_message_id    text unique,
  status           text not null default 'pendente'
                   check (status in ('recebida', 'pendente', 'enviada', 'entregue', 'lida', 'falhou')),
  error            text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- -----------------------------------------------------------------------------
-- Reuniões (Fase 4)
-- -----------------------------------------------------------------------------
create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid references public.leads (id) on delete set null,
  company_id       uuid references public.companies (id) on delete set null,
  conversation_id  uuid references public.conversations (id) on delete set null,
  contact_name     text not null,
  phone_e164       text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  reason           text,
  status           text not null default 'proposta'
                   check (status in ('proposta', 'aguardando_aprovacao', 'confirmada', 'cancelada', 'realizada')),
  notes            text,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint appointments_range_ck check (ends_at > starts_at),
  -- Não permite duas reuniões confirmadas sobrepostas.
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmada')
);

create index appointments_starts_idx on public.appointments (starts_at);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create trigger appointments_audit
  after insert or update or delete on public.appointments
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Vendas (Fase 4) — sempre exigem aprovação humana
-- -----------------------------------------------------------------------------
create table public.sales (
  id                    uuid primary key default gen_random_uuid(),
  lead_id               uuid references public.leads (id) on delete set null,
  company_id            uuid references public.companies (id) on delete set null,
  conversation_id       uuid references public.conversations (id) on delete set null,
  description           text not null,
  amount_cents          integer not null check (amount_cents > 0),
  currency              text not null default 'BRL',
  status                text not null default 'pendente_aprovacao'
                        check (status in ('pendente_aprovacao', 'aprovada', 'rejeitada', 'paga', 'cancelada')),
  requested_by_agent    boolean not null default false,
  approved_by           uuid references auth.users (id) on delete set null,
  approved_at           timestamptz,
  payment_confirmed_by  uuid references auth.users (id) on delete set null,
  payment_confirmed_at  timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint sales_approval_ck check (status not in ('aprovada', 'paga') or approved_by is not null),
  constraint sales_payment_ck check (status <> 'paga' or payment_confirmed_by is not null)
);

create index sales_status_idx on public.sales (status);

create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

create trigger sales_audit
  after insert or update or delete on public.sales
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Retenção mínima de dados (LGPD) e expiração de conteúdo do Google Places
-- -----------------------------------------------------------------------------
create or replace function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.agent_settings%rowtype;
  v_msgs integer;
  v_places integer;
  v_usage integer;
  v_events integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into s from public.agent_settings where id = 1;

  delete from public.messages where created_at < now() - make_interval(days => s.data_retention_days);
  get diagnostics v_msgs = row_count;

  -- Conteúdo de terceiros (Places) de leads sem relacionamento comercial é
  -- apagado após o TTL; o place_id é mantido para deduplicação/atualização.
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

  return jsonb_build_object('messages', v_msgs, 'places_content', v_places,
                            'usage_events', v_usage, 'processed_events', v_events);
end;
$$;

-- -----------------------------------------------------------------------------
-- Painel: métricas agregadas
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start timestamptz := (v_today::timestamp at time zone 'America/Sao_Paulo');
begin
  if not public.is_staff() and auth.uid() is not null then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'today', v_today,
    'companies_today', (select count(*) from public.companies where discovered_at >= v_start and not is_demo),
    'companies_total', (select count(*) from public.companies where not is_demo),
    'demo_companies', (select count(*) from public.companies where is_demo),
    'without_site', (select count(*) from public.companies where not is_demo and website_status in ('not_identified', 'social_only', 'verified_none')),
    'qualified_leads', (select count(*) from public.leads where not is_demo and priority in ('alta', 'media')),
    'leads_by_priority', (select coalesce(jsonb_object_agg(coalesce(priority::text, 'sem_pontuacao'), n), '{}'::jsonb)
                            from (select priority, count(*) n from public.leads where not is_demo group by priority) t),
    'authorized_contacts', (select count(*) from public.leads where contact_status = 'elegivel'),
    'blocked_contacts', (select count(*) from public.suppression_list),
    'conversations_received', (select count(*) from public.conversations where created_at >= v_start),
    'conversations_open', (select count(*) from public.conversations where status <> 'encerrada'),
    'interested', (select count(*) from public.leads where not is_demo and stage in ('interessado', 'proposta')),
    'meetings_upcoming', (select count(*) from public.appointments where status = 'confirmada' and starts_at >= now()),
    'sales_approved', (select count(*) from public.sales where status in ('aprovada', 'paga')),
    'revenue_confirmed_cents', (select coalesce(sum(amount_cents), 0) from public.sales where status = 'paga'),
    'places_requests_today', (select count(*) from public.usage_events where provider = 'google_places' and usage_date = v_today),
    'estimated_cost_today_usd', (select coalesce(sum(estimated_cost_usd), 0) from public.usage_events where usage_date = v_today)
  );
end;
$$;

revoke execute on function public.claim_jobs(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.complete_job(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_job(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.defer_job(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.purge_expired_data() from public, anon;
revoke execute on function public.dashboard_metrics() from public, anon;
grant execute on function public.purge_expired_data() to authenticated;
grant execute on function public.dashboard_metrics() to authenticated;
