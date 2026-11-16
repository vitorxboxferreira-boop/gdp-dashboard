-- =============================================================================
-- Agency AI SDR — 0002 Prospecção
-- Configurações, feriados, áreas de busca, empresas, leads, autorizações (consents),
-- lista de bloqueio e elegibilidade de contato por WhatsApp.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações do agente (linha única, id = 1)
-- Todas as integrações pagas começam DESLIGADAS e exigem ação do administrador.
-- -----------------------------------------------------------------------------
create table public.agent_settings (
  id                            smallint primary key default 1 check (id = 1),

  -- Controle de execução
  automation_paused             boolean not null default false,
  paused_reason                 text,
  paused_at                     timestamptz,
  paused_by                     uuid references auth.users (id) on delete set null,
  autopilot_enabled             boolean not null default false,
  timezone                      text not null default 'America/Sao_Paulo',
  run_on_weekends               boolean not null default false,
  run_on_holidays               boolean not null default false,

  -- Limites diários
  daily_company_limit           integer not null default 50 check (daily_company_limit between 1 and 500),
  places_daily_request_limit    integer not null default 15 check (places_daily_request_limit between 0 and 1000),
  ai_daily_token_limit          integer not null default 200000 check (ai_daily_token_limit >= 0),
  whatsapp_daily_message_limit  integer not null default 50 check (whatsapp_daily_message_limit >= 0),

  -- Integrações (habilitação explícita pelo admin)
  places_enabled                boolean not null default false,
  ai_enabled                    boolean not null default false,
  whatsapp_enabled              boolean not null default false,

  -- Estimativas de custo (USD) — valores de referência; confirme na tabela oficial de preços.
  places_cost_per_request_usd   numeric(10, 5) not null default 0.035 check (places_cost_per_request_usd >= 0),
  ai_cost_per_mtok_input_usd    numeric(10, 4) not null default 4.00 check (ai_cost_per_mtok_input_usd >= 0),
  ai_cost_per_mtok_output_usd   numeric(10, 4) not null default 20.00 check (ai_cost_per_mtok_output_usd >= 0),
  whatsapp_cost_per_message_usd numeric(10, 5) not null default 0.0625 check (whatsapp_cost_per_message_usd >= 0),

  -- Oferta comercial (editável no painel)
  offer                         jsonb not null default jsonb_build_object(
    'product_name', 'Site profissional para empresas locais',
    'price_cents', 25000,
    'currency', 'BRL',
    'includes', jsonb_build_array(
      'Página profissional',
      'Informações da empresa',
      'Catálogo de serviços ou produtos',
      'Endereço e localização',
      'Botão de contato pelo WhatsApp',
      'Layout responsivo para celular'
    ),
    'not_included', jsonb_build_array(
      'Domínio próprio (ex.: .com.br): custo anual do registrador, informado antes da contratação',
      'Hospedagem: custo à parte, informado antes da contratação',
      'Manutenção contínua após a entrega'
    ),
    'max_discount_percent', 0,
    'payment_terms', '',
    'delivery_time', ''
  ),

  -- Pontuação (Agente Analyst)
  category_weights              jsonb not null default jsonb_build_object(
    'beauty_salon', 15, 'hair_care', 15, 'barber_shop', 15, 'nail_salon', 14,
    'dentist', 15, 'dental_clinic', 15, 'doctor', 12, 'physiotherapist', 13,
    'veterinary_care', 14, 'pet_store', 13, 'gym', 13,
    'car_repair', 14, 'car_wash', 12, 'auto_parts_store', 11,
    'restaurant', 13, 'bakery', 13, 'cafe', 12, 'meal_takeaway', 11,
    'clothing_store', 12, 'florist', 12, 'furniture_store', 11, 'hardware_store', 10,
    'real_estate_agency', 11, 'lawyer', 12, 'accounting', 12, 'insurance_agency', 10,
    '_default', 8
  ),
  scoring_thresholds            jsonb not null default jsonb_build_object('alta', 70, 'media', 45),

  -- Retenção (LGPD — minimização)
  data_retention_days           integer not null default 365 check (data_retention_days between 30 and 3650),
  places_content_ttl_days       integer not null default 30 check (places_content_ttl_days between 1 and 365),

  updated_at                    timestamptz not null default now(),
  updated_by                    uuid references auth.users (id) on delete set null
);

insert into public.agent_settings (id) values (1);

create trigger agent_settings_set_updated_at
  before update on public.agent_settings
  for each row execute function public.set_updated_at();

create trigger agent_settings_audit
  after update on public.agent_settings
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Feriados (campanhas não rodam em feriados sem configuração explícita)
-- -----------------------------------------------------------------------------
create table public.holidays (
  holiday_date  date primary key,
  name          text not null,
  scope         text not null default 'nacional' check (scope in ('nacional', 'estadual', 'municipal', 'empresa')),
  created_at    timestamptz not null default now()
);

insert into public.holidays (holiday_date, name, scope) values
  ('2026-01-01', 'Confraternização Universal', 'nacional'),
  ('2026-02-16', 'Carnaval (ponto facultativo)', 'nacional'),
  ('2026-02-17', 'Carnaval (ponto facultativo)', 'nacional'),
  ('2026-04-03', 'Sexta-feira Santa', 'nacional'),
  ('2026-04-21', 'Tiradentes', 'nacional'),
  ('2026-05-01', 'Dia do Trabalho', 'nacional'),
  ('2026-06-04', 'Corpus Christi (ponto facultativo)', 'nacional'),
  ('2026-09-07', 'Independência do Brasil', 'nacional'),
  ('2026-09-20', 'Revolução Farroupilha (RS)', 'estadual'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2026-11-02', 'Finados', 'nacional'),
  ('2026-11-15', 'Proclamação da República', 'nacional'),
  ('2026-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
  ('2026-12-25', 'Natal', 'nacional'),
  ('2027-01-01', 'Confraternização Universal', 'nacional'),
  ('2027-02-08', 'Carnaval (ponto facultativo)', 'nacional'),
  ('2027-02-09', 'Carnaval (ponto facultativo)', 'nacional'),
  ('2027-03-26', 'Sexta-feira Santa', 'nacional'),
  ('2027-04-21', 'Tiradentes', 'nacional'),
  ('2027-05-01', 'Dia do Trabalho', 'nacional'),
  ('2027-05-27', 'Corpus Christi (ponto facultativo)', 'nacional'),
  ('2027-09-07', 'Independência do Brasil', 'nacional'),
  ('2027-09-20', 'Revolução Farroupilha (RS)', 'estadual'),
  ('2027-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2027-11-02', 'Finados', 'nacional'),
  ('2027-11-15', 'Proclamação da República', 'nacional'),
  ('2027-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
  ('2027-12-25', 'Natal', 'nacional');

-- -----------------------------------------------------------------------------
-- Áreas de busca (cidades/regiões) para o Agente Scout
-- -----------------------------------------------------------------------------
create table public.search_areas (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  city             text not null,
  state            text not null,
  country          text not null default 'BR',
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  radius_m         integer not null default 8000 check (radius_m between 500 and 50000),
  categories       text[] not null default '{}',
  category_cursor  integer not null default 0 check (category_cursor >= 0),
  priority         integer not null default 100,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  unique (city, state, country)
);

create trigger search_areas_set_updated_at
  before update on public.search_areas
  for each row execute function public.set_updated_at();

create trigger search_areas_audit
  after insert or update or delete on public.search_areas
  for each row execute function public.audit_row_change();

insert into public.search_areas (name, city, state, latitude, longitude, radius_m, categories, priority)
values (
  'Sant''Ana do Livramento — RS',
  'Sant''Ana do Livramento', 'RS',
  -30.8908, -55.5328, 8000,
  array[
    'salão de beleza', 'barbearia', 'clínica odontológica', 'oficina mecânica',
    'pet shop', 'clínica veterinária', 'academia', 'padaria', 'restaurante',
    'lanchonete', 'loja de roupas', 'floricultura', 'auto peças',
    'escritório de contabilidade', 'imobiliária', 'fisioterapia'
  ],
  10
);

-- -----------------------------------------------------------------------------
-- Empresas
-- -----------------------------------------------------------------------------
create type public.website_status as enum (
  'not_identified',   -- Places não retornou site: NÃO é prova de ausência
  'identified',       -- Places retornou um site próprio
  'social_only',      -- Apenas rede social / plataforma de terceiros
  'verified_none',    -- Verificado manualmente: não possui site
  'verified_exists'   -- Verificado manualmente: possui site
);

create type public.company_source as enum ('google_places', 'manual', 'demo');

create or replace function public.normalize_text(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(
      lower(translate(coalesce(p, ''),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ''’`´',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn    ')),
      '[^a-z0-9]+', ' ', 'g')),
    '');
$$;

create table public.companies (
  id                       uuid primary key default gen_random_uuid(),
  place_id                 text unique,
  source                   public.company_source not null,
  is_demo                  boolean not null default false,

  name                     text not null check (length(btrim(name)) > 0),
  normalized_name          text not null,
  primary_category         text,
  category_label           text,
  types                    text[] not null default '{}',

  formatted_address        text,
  city                     text,
  state                    text,
  country                  text default 'BR',
  latitude                 double precision check (latitude between -90 and 90),
  longitude                double precision check (longitude between -180 and 180),

  phone_national           text,
  phone_e164               text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),

  website_uri              text,
  website_status           public.website_status not null default 'not_identified',
  website_verified_at      timestamptz,
  website_verified_by      uuid references auth.users (id) on delete set null,

  google_maps_uri          text,
  business_status          text,
  rating                   numeric(2, 1) check (rating between 0 and 5),
  user_rating_count        integer check (user_rating_count >= 0),

  search_area_id           uuid references public.search_areas (id) on delete set null,
  discovered_at            timestamptz not null default now(),
  last_seen_at             timestamptz not null default now(),
  places_data_expires_at   timestamptz,
  notes                    text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users (id) on delete set null,

  constraint companies_demo_source_ck check ((source = 'demo') = is_demo),
  constraint companies_places_needs_place_id_ck check (source <> 'google_places' or place_id is not null)
);

comment on column public.companies.website_status is
  'not_identified significa apenas que a fonte não informou site; requer verificação antes de afirmar ausência.';

create unique index companies_dedupe_uidx
  on public.companies (normalized_name, coalesce(city, ''), coalesce(phone_e164, ''));
create index companies_phone_idx on public.companies (phone_e164) where phone_e164 is not null;
create index companies_discovered_idx on public.companies (discovered_at desc);
create index companies_website_status_idx on public.companies (website_status);
create index companies_city_idx on public.companies (city);

create or replace function public.companies_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.normalized_name := coalesce(public.normalize_text(new.name), '');
  new.name := btrim(new.name);
  if new.website_status in ('verified_none', 'verified_exists')
     and (tg_op = 'INSERT' or old.website_status is distinct from new.website_status) then
    new.website_verified_at := now();
    new.website_verified_by := coalesce(auth.uid(), new.website_verified_by);
  end if;
  return new;
end;
$$;

create trigger companies_before_write
  before insert or update on public.companies
  for each row execute function public.companies_before_write();

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger companies_audit
  after update or delete on public.companies
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Leads (ciclo comercial de cada empresa)
-- -----------------------------------------------------------------------------
create type public.lead_priority as enum ('alta', 'media', 'baixa', 'verificar');
create type public.lead_stage as enum (
  'novo', 'qualificado', 'contatado', 'em_conversa', 'interessado',
  'reuniao', 'proposta', 'ganho', 'perdido', 'descartado'
);
create type public.contact_status as enum ('nao_contatavel', 'elegivel', 'bloqueado', 'demo');

create table public.leads (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null unique references public.companies (id) on delete cascade,
  is_demo                 boolean not null default false,

  score                   integer check (score between 0 and 100),
  priority                public.lead_priority,
  score_reasons           jsonb not null default '[]'::jsonb,
  score_version           text,
  scored_at               timestamptz,

  stage                   public.lead_stage not null default 'novo',
  contact_status          public.contact_status not null default 'nao_contatavel',
  eligibility_reasons     jsonb not null default '[]'::jsonb,
  eligibility_checked_at  timestamptz,

  agent_paused            boolean not null default false,
  assigned_to             uuid references auth.users (id) on delete set null,
  lost_reason             text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint leads_demo_never_contactable_ck check (not is_demo or contact_status = 'demo'),
  constraint leads_scored_ck check ((score is null) = (priority is null))
);

create index leads_priority_idx on public.leads (priority, score desc);
create index leads_stage_idx on public.leads (stage);
create index leads_contact_status_idx on public.leads (contact_status);

-- Dados demonstrativos nunca podem ser contatados.
create or replace function public.leads_enforce_demo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_demo boolean;
begin
  select c.is_demo into v_is_demo from public.companies c where c.id = new.company_id;
  if coalesce(v_is_demo, false) then
    new.is_demo := true;
    new.contact_status := 'demo';
  else
    new.is_demo := false;
  end if;
  return new;
end;
$$;

create trigger leads_enforce_demo
  before insert or update on public.leads
  for each row execute function public.leads_enforce_demo();

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger leads_audit
  after update or delete on public.leads
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Lista de bloqueio (descadastro imediato)
-- -----------------------------------------------------------------------------
create table public.suppression_list (
  id           uuid primary key default gen_random_uuid(),
  phone_e164   text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  reason       text not null,
  source       text not null default 'manual'
               check (source in ('opt_out_message', 'manual', 'complaint', 'admin')),
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);

-- -----------------------------------------------------------------------------
-- Autorizações de contato (consentimento / opt-in)
-- -----------------------------------------------------------------------------
create type public.consent_source as enum (
  'mensagem_recebida',  -- o contato iniciou a conversa
  'formulario_site',    -- opt-in em formulário com termo de aceite
  'presencial',         -- autorização coletada pessoalmente, com registro
  'telefone',           -- autorização verbal registrada
  'outro'
);

create table public.consents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references public.companies (id) on delete set null,
  phone_e164      text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  channel         text not null default 'whatsapp' check (channel in ('whatsapp')),
  source          public.consent_source not null,
  evidence        text not null check (length(btrim(evidence)) >= 10),
  granted_at      timestamptz not null,
  expires_at      timestamptz,
  captured_by     uuid references auth.users (id) on delete set null,
  revoked_at      timestamptz,
  revoked_reason  text,
  created_at      timestamptz not null default now(),
  constraint consents_dates_ck check (expires_at is null or expires_at > granted_at)
);

create index consents_phone_active_idx on public.consents (phone_e164) where revoked_at is null;
create index consents_company_idx on public.consents (company_id);

create or replace function public.consents_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.granted_at > now() + interval '5 minutes' then
    raise exception 'data da autorização não pode estar no futuro';
  end if;
  if new.company_id is not null
     and exists (select 1 from public.companies c where c.id = new.company_id and c.is_demo) then
    raise exception 'dados demonstrativos não podem receber autorização de contato';
  end if;
  if exists (select 1 from public.suppression_list s where s.phone_e164 = new.phone_e164) then
    raise exception 'telefone está na lista de bloqueio; remova o bloqueio (admin) antes de registrar nova autorização';
  end if;
  new.captured_by := coalesce(new.captured_by, auth.uid());
  return new;
end;
$$;

create trigger consents_before_insert
  before insert on public.consents
  for each row execute function public.consents_before_insert();

create trigger consents_audit
  after insert or update or delete on public.consents
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Elegibilidade de contato por WhatsApp (fonte única de verdade)
-- -----------------------------------------------------------------------------
create or replace function public.compute_whatsapp_eligibility(p_company_id uuid)
returns table (status public.contact_status, reasons jsonb, consent_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c        public.companies%rowtype;
  v_cons   public.consents%rowtype;
begin
  select * into c from public.companies where id = p_company_id;
  if not found then
    raise exception 'empresa % não encontrada', p_company_id;
  end if;

  if c.is_demo then
    return query select 'demo'::public.contact_status,
      jsonb_build_array('Dado demonstrativo fictício: nunca pode ser contatado'), null::uuid;
    return;
  end if;

  if c.phone_e164 is null then
    return query select 'nao_contatavel'::public.contact_status,
      jsonb_build_array('Sem telefone válido em formato internacional'), null::uuid;
    return;
  end if;

  if exists (select 1 from public.suppression_list s where s.phone_e164 = c.phone_e164) then
    return query select 'bloqueado'::public.contact_status,
      jsonb_build_array('Telefone na lista de bloqueio/descadastro'), null::uuid;
    return;
  end if;

  select * into v_cons
    from public.consents k
   where k.phone_e164 = c.phone_e164
     and k.channel = 'whatsapp'
     and k.revoked_at is null
     and k.granted_at <= now()
     and (k.expires_at is null or k.expires_at > now())
   order by k.granted_at desc
   limit 1;

  if found then
    return query select 'elegivel'::public.contact_status,
      jsonb_build_array(
        format('Autorização válida: origem "%s" em %s', v_cons.source,
               to_char(v_cons.granted_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')),
        'Envio ainda depende de: integração WhatsApp ativa, janela de atendimento/template aprovado e limites diários'
      ),
      v_cons.id;
    return;
  end if;

  return query select 'nao_contatavel'::public.contact_status,
    jsonb_build_array('Sem autorização válida registrada para WhatsApp: não pode receber mensagem iniciada pela empresa'),
    null::uuid;
end;
$$;

create or replace function public.refresh_lead_eligibility(p_lead_id uuid)
returns public.contact_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
  r record;
begin
  if auth.uid() is not null and not public.can_operate() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select company_id into v_company from public.leads where id = p_lead_id;
  if v_company is null then
    raise exception 'lead % não encontrado', p_lead_id;
  end if;
  select * into r from public.compute_whatsapp_eligibility(v_company);
  update public.leads
     set contact_status = r.status,
         eligibility_reasons = r.reasons,
         eligibility_checked_at = now()
   where id = p_lead_id
     and (contact_status is distinct from r.status
          or eligibility_reasons is distinct from r.reasons
          or eligibility_checked_at is null
          or eligibility_checked_at < now() - interval '1 hour');
  return r.status;
end;
$$;

create or replace function public.refresh_all_lead_eligibility()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead record;
  v_status public.contact_status;
  v_result jsonb := '{}'::jsonb;
begin
  if auth.uid() is not null and not public.can_operate() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  for v_lead in select id from public.leads loop
    v_status := public.refresh_lead_eligibility(v_lead.id);
    v_result := jsonb_set(v_result, array[v_status::text],
                          to_jsonb(coalesce((v_result ->> v_status::text)::int, 0) + 1));
  end loop;
  return v_result;
end;
$$;

-- Ao bloquear um telefone: revoga autorizações e marca leads como bloqueados imediatamente.
create or replace function public.suppression_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.consents
     set revoked_at = now(),
         revoked_reason = coalesce(revoked_reason, 'Bloqueio/descadastro: ' || new.reason)
   where phone_e164 = new.phone_e164
     and revoked_at is null;

  update public.leads l
     set contact_status = 'bloqueado',
         eligibility_reasons = jsonb_build_array('Telefone na lista de bloqueio/descadastro'),
         eligibility_checked_at = now()
    from public.companies c
   where c.id = l.company_id
     and c.phone_e164 = new.phone_e164
     and not l.is_demo;
  return new;
end;
$$;

create trigger suppression_after_insert
  after insert on public.suppression_list
  for each row execute function public.suppression_after_insert();

create trigger suppression_audit
  after insert or update or delete on public.suppression_list
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Parada de emergência
--   operadores podem PAUSAR; somente administradores podem RETOMAR.
-- -----------------------------------------------------------------------------
create or replace function public.set_automation_paused(p_paused boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if p_paused and not public.can_operate() then
      raise exception 'permission denied' using errcode = '42501';
    end if;
    if not p_paused and not public.is_admin() then
      raise exception 'apenas administradores podem retomar as automações' using errcode = '42501';
    end if;
  end if;

  update public.agent_settings
     set automation_paused = p_paused,
         paused_reason = case when p_paused then coalesce(nullif(btrim(p_reason), ''), 'Parada de emergência') else null end,
         paused_at = case when p_paused then now() else null end,
         paused_by = case when p_paused then auth.uid() else null end,
         updated_by = auth.uid()
   where id = 1;

  -- Cancela tarefas pendentes para que nada seja executado enquanto pausado.
  if p_paused then
    update public.jobs
       set status = 'cancelled', finished_at = now(), last_error = 'Cancelado pela parada de emergência'
     where status in ('queued', 'running');
  end if;

  perform public.log_action(
    case when p_paused then 'automation.paused' else 'automation.resumed' end,
    'agent_settings', '1', jsonb_build_object('reason', p_reason));
end;
$$;

revoke execute on function public.compute_whatsapp_eligibility(uuid) from public, anon;
revoke execute on function public.refresh_lead_eligibility(uuid) from public, anon;
revoke execute on function public.refresh_all_lead_eligibility() from public, anon;
revoke execute on function public.set_automation_paused(boolean, text) from public, anon;
revoke execute on function public.suppression_after_insert() from public, anon, authenticated;
grant execute on function public.compute_whatsapp_eligibility(uuid) to authenticated;
grant execute on function public.refresh_lead_eligibility(uuid) to authenticated;
grant execute on function public.refresh_all_lead_eligibility() to authenticated;
grant execute on function public.set_automation_paused(boolean, text) to authenticated;
