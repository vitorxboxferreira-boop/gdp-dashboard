-- Agency AI SDR — banco completo (todas as migrations em ordem).
-- GERADO a partir de supabase/migrations/. Use em projeto NOVO, uma única vez, no SQL Editor do Supabase.
-- Alternativa equivalente: supabase db push
begin;

-- >>> 20261115000100_foundation.sql
-- =============================================================================
-- Agency AI SDR — 0001 Foundation
-- Perfis, papéis, funções auxiliares de autorização e auditoria.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Papéis da aplicação
--   pending  : usuário autenticado sem acesso (padrão para novos usuários)
--   viewer   : leitura do painel
--   operator : opera empresas/leads, pode acionar parada de emergência
--   admin    : configurações, integrações, limites, papéis, reativar automações
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('pending', 'viewer', 'operator', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.app_role not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil e papel de cada usuário do painel. Novos usuários entram como pending.';

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Funções de autorização (security definer para evitar recursão de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.current_role_level()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case p.role
              when 'admin'    then 3
              when 'operator' then 2
              when 'viewer'   then 1
              else 0
            end
       from public.profiles p
      where p.id = auth.uid()),
    0);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_role_level() >= 1; $$;

create or replace function public.can_operate()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_role_level() >= 2; $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_role_level() >= 3; $$;

-- -----------------------------------------------------------------------------
-- Criação automática de perfil ao cadastrar usuário no Supabase Auth
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id,
          coalesce(new.email, ''),
          nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     uuid,
  actor_type   text not null default 'user' check (actor_type in ('user', 'system', 'agent')),
  action       text not null,
  entity       text not null,
  entity_id    text,
  old_data     jsonb,
  new_data     jsonb,
  metadata     jsonb
);

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, occurred_at desc);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);

comment on table public.audit_logs is 'Histórico imutável de alterações e ações administrativas.';

-- Registra apenas as colunas alteradas em UPDATE para manter o log enxuto.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id  text;
  v_key text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id  := v_new ->> 'id';
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_id  := v_old ->> 'id';
  else
    v_old := '{}'::jsonb;
    v_new := '{}'::jsonb;
    for v_key in select jsonb_object_keys(to_jsonb(new)) loop
      if v_key = 'updated_at' then continue; end if;
      if (to_jsonb(new) -> v_key) is distinct from (to_jsonb(old) -> v_key) then
        v_old := v_old || jsonb_build_object(v_key, to_jsonb(old) -> v_key);
        v_new := v_new || jsonb_build_object(v_key, to_jsonb(new) -> v_key);
      end if;
    end loop;
    if v_new = '{}'::jsonb then
      return new;
    end if;
    v_id := to_jsonb(new) ->> 'id';
  end if;

  insert into public.audit_logs (actor_id, actor_type, action, entity, entity_id, old_data, new_data)
  values (auth.uid(),
          case when auth.uid() is null then 'system' else 'user' end,
          lower(tg_op),
          tg_table_name,
          v_id,
          v_old,
          v_new);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();

-- Registro de ações customizadas (ex.: "automation.paused") a partir do painel.
create or replace function public.log_action(
  p_action    text,
  p_entity    text,
  p_entity_id text default null,
  p_metadata  jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_id, actor_type, action, entity, entity_id, metadata)
  values (auth.uid(),
          case when auth.uid() is null then 'system' else 'user' end,
          p_action, p_entity, p_entity_id, p_metadata);
end;
$$;

-- -----------------------------------------------------------------------------
-- Gestão de papéis
--   * Pelo SQL Editor (postgres) é possível promover o primeiro administrador.
--   * Pela API, apenas administradores podem alterar papéis.
-- -----------------------------------------------------------------------------
create or replace function public.grant_role(p_email text, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'apenas administradores podem alterar papéis' using errcode = '42501';
  end if;
  if auth.uid() is not null and p_role <> 'admin'
     and exists (select 1 from public.profiles where id = auth.uid() and lower(email) = lower(p_email)) then
    raise exception 'um administrador não pode rebaixar a si mesmo' using errcode = '42501';
  end if;

  update public.profiles set role = p_role where lower(email) = lower(p_email);
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'usuário % não encontrado em profiles', p_email;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self_or_staff on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- Funções sensíveis não devem ser executáveis por anon.
revoke execute on function public.grant_role(text, public.app_role) from public, anon;
revoke execute on function public.log_action(text, text, text, jsonb) from public, anon;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
grant execute on function public.grant_role(text, public.app_role) to authenticated;
grant execute on function public.log_action(text, text, text, jsonb) to authenticated;

-- >>> 20261115000200_prospecting.sql
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

-- >>> 20261115000300_operations.sql
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

-- >>> 20261115000400_rls.sql
-- =============================================================================
-- Agency AI SDR — 0004 Row Level Security e privilégios
--   viewer   : leitura
--   operator : leitura + escrita operacional
--   admin    : tudo, inclusive configurações, feriados e remoção de bloqueios
--   anon     : nenhum acesso a tabelas
--   service_role (Edge Functions / servidor): ignora RLS, nunca exposto ao navegador
-- =============================================================================

alter table public.agent_settings   enable row level security;
alter table public.holidays         enable row level security;
alter table public.search_areas     enable row level security;
alter table public.companies        enable row level security;
alter table public.leads            enable row level security;
alter table public.suppression_list enable row level security;
alter table public.consents         enable row level security;
alter table public.campaigns        enable row level security;
alter table public.jobs             enable row level security;
alter table public.usage_events     enable row level security;
alter table public.daily_reports    enable row level security;
alter table public.processed_events enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.appointments     enable row level security;
alter table public.sales            enable row level security;

-- Leitura para toda a equipe
create policy agent_settings_select on public.agent_settings   for select to authenticated using (public.is_staff());
create policy holidays_select       on public.holidays         for select to authenticated using (public.is_staff());
create policy search_areas_select   on public.search_areas     for select to authenticated using (public.is_staff());
create policy companies_select      on public.companies        for select to authenticated using (public.is_staff());
create policy leads_select          on public.leads            for select to authenticated using (public.is_staff());
create policy suppression_select    on public.suppression_list for select to authenticated using (public.is_staff());
create policy consents_select       on public.consents         for select to authenticated using (public.is_staff());
create policy campaigns_select      on public.campaigns        for select to authenticated using (public.is_staff());
create policy jobs_select           on public.jobs             for select to authenticated using (public.is_staff());
create policy usage_events_select   on public.usage_events     for select to authenticated using (public.is_staff());
create policy daily_reports_select  on public.daily_reports    for select to authenticated using (public.is_staff());
create policy conversations_select  on public.conversations    for select to authenticated using (public.is_staff());
create policy messages_select       on public.messages         for select to authenticated using (public.is_staff());
create policy appointments_select   on public.appointments     for select to authenticated using (public.is_staff());
create policy sales_select          on public.sales            for select to authenticated using (public.is_staff());

-- Administração
create policy agent_settings_update_admin on public.agent_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy holidays_write_admin on public.holidays
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy search_areas_write_admin on public.search_areas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy suppression_delete_admin on public.suppression_list
  for delete to authenticated using (public.is_admin());

-- Operação
create policy companies_insert_operator on public.companies
  for insert to authenticated with check (public.can_operate() and source = 'manual');
create policy companies_update_operator on public.companies
  for update to authenticated using (public.can_operate()) with check (public.can_operate());
create policy companies_delete_admin on public.companies
  for delete to authenticated using (public.is_admin());

create policy leads_insert_operator on public.leads
  for insert to authenticated with check (public.can_operate());
create policy leads_update_operator on public.leads
  for update to authenticated using (public.can_operate()) with check (public.can_operate());

create policy suppression_insert_operator on public.suppression_list
  for insert to authenticated with check (public.can_operate());

create policy consents_insert_operator on public.consents
  for insert to authenticated with check (public.can_operate());
-- Autorizações não são editadas, apenas revogadas.
create policy consents_update_operator on public.consents
  for update to authenticated using (public.can_operate()) with check (public.can_operate());

create policy campaigns_insert_operator on public.campaigns
  for insert to authenticated with check (public.can_operate() and trigger = 'manual');

create policy conversations_update_operator on public.conversations
  for update to authenticated using (public.can_operate()) with check (public.can_operate());
create policy messages_insert_operator on public.messages
  for insert to authenticated with check (public.can_operate() and direction = 'outbound' and sender = 'humano');

create policy appointments_write_operator on public.appointments
  for all to authenticated using (public.can_operate()) with check (public.can_operate());

create policy sales_insert_operator on public.sales
  for insert to authenticated with check (public.can_operate() and status = 'pendente_aprovacao');
create policy sales_update_admin on public.sales
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Consentimentos: impedir alteração de campos de evidência após criação.
create or replace function public.consents_immutable_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone_e164 is distinct from old.phone_e164
     or new.source is distinct from old.source
     or new.evidence is distinct from old.evidence
     or new.granted_at is distinct from old.granted_at
     or new.channel is distinct from old.channel then
    raise exception 'autorizações são imutáveis; revogue e registre uma nova';
  end if;
  if old.revoked_at is not null and new.revoked_at is null then
    raise exception 'autorização revogada não pode ser reativada; registre uma nova';
  end if;
  return new;
end;
$$;

create trigger consents_immutable_evidence
  before update on public.consents
  for each row execute function public.consents_immutable_evidence();

-- -----------------------------------------------------------------------------
-- Privilégios: anon não acessa nenhuma tabela; usuários autenticados seguem RLS.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Tabelas internas: apenas leitura para authenticated (escrita somente via service_role).
revoke insert, update, delete, truncate on public.jobs, public.usage_events,
  public.processed_events, public.daily_reports, public.audit_logs from authenticated;

grant execute on function public.claim_jobs(text, integer, integer) to service_role;
grant execute on function public.complete_job(uuid, jsonb) to service_role;
grant execute on function public.fail_job(uuid, text, boolean) to service_role;
grant execute on function public.defer_job(uuid, integer, text) to service_role;

-- >>> 20261115000500_agent_rpc.sql
-- =============================================================================
-- Agency AI SDR — 0005 RPCs usadas pelos agentes (Scout/Analyst/orquestrador)
-- Executadas com service_role pelas Edge Functions ou por ações de servidor.
-- =============================================================================

-- Empresas que ainda não têm pontuação ou cuja pontuação ficou desatualizada.
create or replace function public.companies_pending_scoring(p_limit integer default 100)
returns table (
  id uuid,
  website_status public.website_status,
  website_uri text,
  primary_category text,
  types text[],
  phone_e164 text,
  formatted_address text,
  business_status text,
  rating numeric,
  user_rating_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.website_status, c.website_uri, c.primary_category, c.types, c.phone_e164,
         c.formatted_address, c.business_status, c.rating, c.user_rating_count
    from public.companies c
    left join public.leads l on l.company_id = c.id
   where l.id is null
      or l.scored_at is null
      or l.scored_at < c.updated_at
   order by c.discovered_at
   limit greatest(1, least(p_limit, 500));
$$;

-- Organiza leads após a pontuação: novos de alta/média prioridade viram "qualificado";
-- empresas permanentemente fechadas são descartadas.
create or replace function public.classify_leads()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qualified integer;
  v_discarded integer;
begin
  if auth.uid() is not null and not public.can_operate() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  update public.leads l
     set stage = 'qualificado'
   where l.stage = 'novo'
     and l.priority in ('alta', 'media');
  get diagnostics v_qualified = row_count;

  update public.leads l
     set stage = 'descartado', lost_reason = 'Empresa permanentemente fechada segundo a fonte'
    from public.companies c
   where c.id = l.company_id
     and c.business_status = 'CLOSED_PERMANENTLY'
     and l.stage in ('novo', 'qualificado');
  get diagnostics v_discarded = row_count;

  return jsonb_build_object('qualified', v_qualified, 'discarded', v_discarded);
end;
$$;

revoke execute on function public.companies_pending_scoring(integer) from public, anon, authenticated;
revoke execute on function public.classify_leads() from public, anon;
grant execute on function public.companies_pending_scoring(integer) to service_role;
grant execute on function public.classify_leads() to authenticated, service_role;

-- >>> 20261116000100_whatsapp.sql
-- =============================================================================
-- Agency AI SDR — 0006 WhatsApp (Fase 2)
-- Recebimento idempotente de mensagens, status de entrega, descadastro imediato,
-- verificação de envio (janela de 24h, modo de teste, limites) e tempo real.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações
-- -----------------------------------------------------------------------------
alter table public.agent_settings
  -- Modo de teste: enquanto ligado, envios só para números da lista abaixo.
  add column whatsapp_test_mode boolean not null default true,
  add column whatsapp_test_numbers text[] not null default '{}'
    check (array_position(whatsapp_test_numbers, null) is null),
  add column opt_out_keywords text[] not null default array[
    'parar', 'pare', 'sair', 'stop', 'cancelar', 'descadastrar', 'remover',
    'nao quero receber', 'nao quero mais', 'nao me mande mais', 'nao envie mais'
  ],
  add column human_request_keywords text[] not null default array[
    'atendente', 'humano', 'pessoa real', 'falar com alguem', 'falar com uma pessoa', 'falar com o responsavel'
  ];

-- -----------------------------------------------------------------------------
-- Conversas e mensagens: colunas adicionais
-- -----------------------------------------------------------------------------
alter table public.conversations
  add column wa_id text,
  add column phone_number_id text,
  add column last_message_preview text,
  add column unread_count integer not null default 0 check (unread_count >= 0),
  add column human_requested_at timestamptz,
  add column opted_out_at timestamptz;

alter table public.messages
  add column wa_timestamp timestamptz,
  add column status_updated_at timestamptz,
  add column sent_by uuid references auth.users (id) on delete set null,
  add column idempotency_key text unique;

-- Envios só pelo servidor (que aplica as verificações); usuários não gravam mensagens direto.
drop policy if exists messages_insert_operator on public.messages;

-- Campos controlados pelo sistema não podem ser alterados pelo painel
-- (impede, por exemplo, "abrir" a janela de 24h manualmente).
create or replace function public.conversations_protect_system_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
       new.phone_e164 is distinct from old.phone_e164
    or new.wa_id is distinct from old.wa_id
    or new.phone_number_id is distinct from old.phone_number_id
    or new.last_inbound_at is distinct from old.last_inbound_at
    or new.last_outbound_at is distinct from old.last_outbound_at
    or new.service_window_expires_at is distinct from old.service_window_expires_at
    or new.opted_out_at is distinct from old.opted_out_at
    or new.company_id is distinct from old.company_id
    or new.lead_id is distinct from old.lead_id) then
    raise exception 'campos controlados pelo sistema não podem ser alterados pelo painel';
  end if;
  if auth.uid() is not null and old.opted_out_at is not null
     and new.agent_paused = false then
    raise exception 'contato descadastrado: o agente não pode ser reativado nesta conversa';
  end if;
  return new;
end;
$$;

create trigger conversations_protect_system_columns
  before update on public.conversations
  for each row execute function public.conversations_protect_system_columns();

-- -----------------------------------------------------------------------------
-- Recebimento de mensagem (idempotente). Chamado pelo webhook com service_role.
-- -----------------------------------------------------------------------------
create or replace function public.ingest_whatsapp_message(
  p_event_id        text,
  p_wa_id           text,
  p_phone_e164      text,
  p_contact_name    text,
  p_phone_number_id text,
  p_type            text,
  p_body            text,
  p_timestamp       timestamptz,
  p_opt_out         boolean default false,
  p_human_request   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv     public.conversations%rowtype;
  v_company  uuid;
  v_lead     uuid;
  v_msg      uuid;
  v_ts       timestamptz := least(coalesce(p_timestamp, now()), now());
  v_preview  text := left(coalesce(p_body, '[' || p_type || ']'), 140);
begin
  if p_event_id is null or p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'evento inválido';
  end if;

  -- 1) Idempotência: o mesmo wamid nunca é processado duas vezes.
  insert into public.processed_events (source, event_id)
  values ('whatsapp.message', p_event_id)
  on conflict (source, event_id) do nothing;
  if not found then
    return jsonb_build_object('duplicate', true);
  end if;

  -- 2) Conversa aberta para o telefone (cria se necessário, seguro sob concorrência)
  select c.id, l.id into v_company, v_lead
    from public.companies c
    left join public.leads l on l.company_id = c.id
   where c.phone_e164 = p_phone_e164 and not c.is_demo
   order by c.created_at
   limit 1;

  insert into public.conversations (phone_e164, wa_id, phone_number_id, contact_name, company_id, lead_id)
  values (p_phone_e164, p_wa_id, p_phone_number_id, nullif(btrim(p_contact_name), ''), v_company, v_lead)
  on conflict (phone_e164) where status <> 'encerrada' do nothing;

  select * into v_conv from public.conversations
   where phone_e164 = p_phone_e164 and status <> 'encerrada'
   for update;

  -- 3) Mensagem
  insert into public.messages (conversation_id, direction, sender, message_type, body, wa_message_id, status, wa_timestamp, created_at)
  values (v_conv.id, 'inbound', 'cliente', coalesce(p_type, 'text'), p_body, p_event_id, 'recebida', v_ts, now())
  on conflict (wa_message_id) do nothing
  returning id into v_msg;

  -- 4) Janela de atendimento (24h a partir da última mensagem do cliente)
  update public.conversations
     set wa_id = coalesce(p_wa_id, wa_id),
         phone_number_id = coalesce(p_phone_number_id, phone_number_id),
         contact_name = coalesce(nullif(btrim(p_contact_name), ''), contact_name),
         last_inbound_at = greatest(coalesce(last_inbound_at, v_ts), v_ts),
         service_window_expires_at = greatest(coalesce(last_inbound_at, v_ts), v_ts) + interval '24 hours',
         last_message_preview = v_preview,
         unread_count = unread_count + 1,
         status = case when status = 'aguardando_cliente' then 'aberta' else status end,
         company_id = coalesce(company_id, v_company),
         lead_id = coalesce(lead_id, v_lead)
   where id = v_conv.id;

  -- 5) Pedido de atendimento humano: pausa o agente nesta conversa
  if p_human_request then
    update public.conversations
       set status = 'humano', handled_by = 'humano', agent_paused = true, human_requested_at = now()
     where id = v_conv.id;
  end if;

  -- 6) Descadastro imediato
  if p_opt_out then
    insert into public.suppression_list (phone_e164, reason, source)
    values (p_phone_e164, 'Pedido de descadastro via WhatsApp: "' || left(coalesce(p_body, ''), 200) || '"', 'opt_out_message')
    on conflict (phone_e164) do nothing;
    update public.conversations
       set opted_out_at = coalesce(opted_out_at, now()), agent_paused = true
     where id = v_conv.id;
  end if;

  -- 7) Funil: lead que responde passa para "em conversa"
  if coalesce(v_conv.lead_id, v_lead) is not null then
    update public.leads
       set stage = 'em_conversa'
     where id = coalesce(v_conv.lead_id, v_lead)
       and stage in ('novo', 'qualificado', 'contatado');
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'conversation_id', v_conv.id,
    'message_id', v_msg,
    'opted_out', p_opt_out,
    'human_requested', p_human_request);
end;
$$;

-- -----------------------------------------------------------------------------
-- Status de entrega (sent → delivered → read; failed). Nunca regride.
-- -----------------------------------------------------------------------------
create or replace function public.apply_whatsapp_status(
  p_wamid     text,
  p_status    text,
  p_timestamp timestamptz,
  p_error     text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new  text := case p_status when 'sent' then 'enviada' when 'delivered' then 'entregue'
                               when 'read' then 'lida' when 'failed' then 'falhou' else null end;
  v_rank_new int;
  v_count int;
begin
  if v_new is null then
    return false;
  end if;
  v_rank_new := case v_new when 'enviada' then 1 when 'entregue' then 2 when 'lida' then 3 else 0 end;

  update public.messages m
     set status = v_new,
         status_updated_at = coalesce(p_timestamp, now()),
         error = case when v_new = 'falhou' then left(coalesce(p_error, 'Falha informada pelo WhatsApp'), 1000) else m.error end
   where m.wa_message_id = p_wamid
     and m.direction = 'outbound'
     and (
       (v_new = 'falhou' and m.status in ('pendente', 'enviada'))
       or (v_new <> 'falhou' and m.status <> 'falhou'
           and v_rank_new > case m.status when 'enviada' then 1 when 'entregue' then 2 when 'lida' then 3 else 0 end)
     );
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- -----------------------------------------------------------------------------
-- Verificação de envio (fonte única de verdade, chamada antes de cada envio)
--   p_sender: 'humano' (operador no painel) | 'agente' (Fase 3)
--   p_kind  : 'free_text' (dentro da janela de 24h) | 'template' (iniciado pela empresa)
-- -----------------------------------------------------------------------------
create or replace function public.whatsapp_send_check(
  p_conversation_id uuid,
  p_sender text default 'humano',
  p_kind   text default 'free_text'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s        public.agent_settings%rowtype;
  v        public.conversations%rowtype;
  v_reasons text[] := '{}';
  v_today  date := (now() at time zone 'America/Sao_Paulo')::date;
  v_sent   integer;
  v_elig   public.contact_status;
begin
  if auth.uid() is not null and not public.can_operate() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into s from public.agent_settings where id = 1;
  select * into v from public.conversations where id = p_conversation_id;
  if not found then
    return jsonb_build_object('allowed', false, 'reasons', jsonb_build_array('Conversa não encontrada'));
  end if;

  if not s.whatsapp_enabled then
    v_reasons := array_append(v_reasons, ('Integração WhatsApp desativada nas Configurações')::text);
  end if;
  if v.status = 'encerrada' then
    v_reasons := array_append(v_reasons, ('Conversa encerrada')::text);
  end if;
  if v.opted_out_at is not null
     or exists (select 1 from public.suppression_list x where x.phone_e164 = v.phone_e164) then
    v_reasons := array_append(v_reasons, ('Contato descadastrado / na lista de bloqueio')::text);
  end if;
  if exists (select 1 from public.companies c where c.id = v.company_id and c.is_demo) then
    v_reasons := array_append(v_reasons, ('Dado demonstrativo: nunca contatar')::text);
  end if;
  if s.whatsapp_test_mode and not (v.phone_e164 = any (s.whatsapp_test_numbers)) then
    v_reasons := array_append(v_reasons, ('Modo de teste ativo: número fora da lista de testes')::text);
  end if;

  if p_kind = 'free_text' then
    if v.service_window_expires_at is null or v.service_window_expires_at <= now() then
      v_reasons := array_append(v_reasons, ('Fora da janela de 24h de atendimento: só é permitido template aprovado')::text);
    end if;
  elsif p_kind = 'template' then
    -- Mensagem iniciada pela empresa: exige autorização válida registrada.
    if v.company_id is null then
      v_reasons := array_append(v_reasons, ('Conversa sem empresa vinculada: autorização não verificável')::text);
    else
      select status into v_elig from public.compute_whatsapp_eligibility(v.company_id);
      if v_elig <> 'elegivel' then
        v_reasons := array_append(v_reasons, ('Sem autorização válida para mensagem iniciada pela empresa')::text);
      end if;
    end if;
    v_reasons := array_append(v_reasons, ('Envio de templates ainda não implementado')::text);
  else
    v_reasons := array_append(v_reasons, ('Tipo de envio inválido')::text);
  end if;

  if p_sender = 'agente' then
    if s.automation_paused then v_reasons := array_append(v_reasons, ('Automações pausadas (parada de emergência)')::text); end if;
    if not s.ai_enabled then v_reasons := array_append(v_reasons, ('Agente de IA desativado')::text); end if;
    if v.agent_paused or v.handled_by = 'humano' then v_reasons := array_append(v_reasons, ('Conversa sob atendimento humano')::text); end if;
  end if;

  select count(*) into v_sent
    from public.messages m
   where m.direction = 'outbound'
     and m.status <> 'falhou'
     and (m.created_at at time zone 'America/Sao_Paulo')::date = v_today;
  if v_sent >= s.whatsapp_daily_message_limit then
    v_reasons := array_append(v_reasons, (format('Limite diário de mensagens atingido (%s)', s.whatsapp_daily_message_limit))::text);
  end if;

  return jsonb_build_object(
    'allowed', cardinality(v_reasons) = 0,
    'reasons', to_jsonb(v_reasons),
    'window_expires_at', v.service_window_expires_at,
    'sent_today', v_sent,
    'daily_limit', s.whatsapp_daily_message_limit);
end;
$$;

-- -----------------------------------------------------------------------------
-- Registro de envio (antes e depois da chamada à API) — idempotente por chave.
-- -----------------------------------------------------------------------------
create or replace function public.register_outbound_message(
  p_conversation_id uuid,
  p_body            text,
  p_sender          text,
  p_sent_by         uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_existing public.messages%rowtype;
begin
  if p_sender not in ('humano', 'agente') then
    raise exception 'remetente inválido';
  end if;
  if length(btrim(coalesce(p_body, ''))) = 0 or length(p_body) > 4096 then
    raise exception 'mensagem vazia ou acima de 4096 caracteres';
  end if;
  select * into v_existing from public.messages where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('message_id', v_existing.id, 'duplicate', true, 'status', v_existing.status);
  end if;
  insert into public.messages (conversation_id, direction, sender, message_type, body, status, sent_by, idempotency_key)
  values (p_conversation_id, 'outbound', p_sender, 'text', p_body, 'pendente', p_sent_by, p_idempotency_key)
  returning id into v_id;
  return jsonb_build_object('message_id', v_id, 'duplicate', false, 'status', 'pendente');
end;
$$;

create or replace function public.complete_outbound_message(
  p_message_id uuid,
  p_wamid      text,
  p_error      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv uuid;
begin
  update public.messages
     set wa_message_id = coalesce(p_wamid, wa_message_id),
         status = case when p_error is null then 'enviada' else 'falhou' end,
         error = left(p_error, 1000),
         sent_at = case when p_error is null then now() else null end,
         status_updated_at = now()
   where id = p_message_id and status = 'pendente'
  returning conversation_id into v_conv;

  if v_conv is not null and p_error is null then
    update public.conversations
       set last_outbound_at = now(),
           status = case when status = 'aberta' then 'aguardando_cliente' else status end,
           unread_count = 0
     where id = v_conv;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke execute on function public.ingest_whatsapp_message(text, text, text, text, text, text, text, timestamptz, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.apply_whatsapp_status(text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.register_outbound_message(uuid, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.complete_outbound_message(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.whatsapp_send_check(uuid, text, text) from public, anon;
revoke execute on function public.conversations_protect_system_columns() from public, anon, authenticated;
grant execute on function public.ingest_whatsapp_message(text, text, text, text, text, text, text, timestamptz, boolean, boolean) to service_role;
grant execute on function public.apply_whatsapp_status(text, text, timestamptz, text) to service_role;
grant execute on function public.register_outbound_message(uuid, text, text, uuid, text) to service_role;
grant execute on function public.complete_outbound_message(uuid, text, text) to service_role;
grant execute on function public.whatsapp_send_check(uuid, text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tempo real (Supabase Realtime respeita RLS: apenas a equipe recebe eventos)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.conversations;
  end if;
end $$;

-- >>> 20261117000100_ai_agents.sql
-- =============================================================================
-- Agency AI SDR — 0007 Agentes de IA (Fase 3): SDR e Closer
-- Base de conhecimento, configurações da IA, fila de respostas e oportunidades.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações da IA
-- -----------------------------------------------------------------------------
alter table public.agent_settings
  add column agency_name text not null default '',
  add column assistant_name text not null default 'Assistente virtual',
  add column ai_effort text not null default 'low' check (ai_effort in ('low', 'medium', 'high')),
  add column ai_max_replies_per_conversation_day integer not null default 15
    check (ai_max_replies_per_conversation_day between 1 and 100),
  add column agent_hours_start time not null default '08:00',
  add column agent_hours_end time not null default '18:00',
  add column agent_days smallint[] not null default '{1,2,3,4,5}',
  add constraint agent_settings_hours_ck check (agent_hours_end > agent_hours_start);

-- -----------------------------------------------------------------------------
-- Base de conhecimento
-- -----------------------------------------------------------------------------
create table public.knowledge_base (
  id                       uuid primary key default gen_random_uuid(),
  kind                     text not null check (kind in ('servico', 'faq', 'objecao', 'condicao', 'limitacao', 'portfolio')),
  title                    text not null check (length(btrim(title)) between 3 and 200),
  content                  text not null check (length(btrim(content)) between 10 and 4000),
  url                      text,
  -- Portfólio: somente projetos reais com autorização do cliente para divulgação.
  client_authorized        boolean not null default false,
  authorization_note       text,
  active                   boolean not null default true,
  sort_order               integer not null default 100,
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint knowledge_portfolio_authorized_ck check (
    kind <> 'portfolio' or (client_authorized and url is not null and length(btrim(coalesce(authorization_note, ''))) >= 10)
  )
);

create index knowledge_base_active_idx on public.knowledge_base (active, kind, sort_order);

create trigger knowledge_base_set_updated_at
  before update on public.knowledge_base
  for each row execute function public.set_updated_at();

create trigger knowledge_base_audit
  after insert or update or delete on public.knowledge_base
  for each row execute function public.audit_row_change();

alter table public.knowledge_base enable row level security;
create policy knowledge_base_select on public.knowledge_base for select to authenticated using (public.is_staff());
create policy knowledge_base_write_admin on public.knowledge_base
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Conteúdo inicial: orientações honestas (sem depoimentos, clientes ou resultados inventados).
insert into public.knowledge_base (kind, title, content, sort_order) values
  ('servico', 'O que oferecemos',
   'Criação de um site profissional para empresas locais: uma página com as informações da empresa, catálogo de serviços ou produtos, endereço e localização, botão de contato pelo WhatsApp e layout adaptado para celular. O objetivo é a empresa ser encontrada e passar confiança a quem pesquisa na internet.', 10),
  ('servico', 'Por que ter um site além das redes sociais',
   'O site é um endereço próprio da empresa, que não depende do algoritmo de uma rede social, reúne em um só lugar serviços, preços, endereço e contato e pode ser compartilhado em qualquer lugar. Não substitui o Instagram: os dois se complementam.', 20),
  ('limitacao', 'O que NÃO está incluído no pacote inicial',
   'Domínio próprio (ex.: .com.br) e hospedagem têm custos à parte, informados pela equipe antes da contratação. Manutenção contínua após a entrega não está incluída. Não prometemos domínio grátis, hospedagem grátis nem manutenção vitalícia.', 30),
  ('limitacao', 'Sem garantia de resultados',
   'Não garantimos aumento de vendas, de clientes ou posição no Google. O site melhora a presença digital, mas os resultados dependem de vários fatores do negócio.', 40),
  ('limitacao', 'Limites do assistente virtual',
   'O assistente virtual não fecha contratos, não confirma pagamentos, não assina nada e não confirma reuniões sem a equipe. Quando o cliente quer contratar, marcar reunião ou pede algo fora do padrão, a equipe humana assume.', 50),
  ('objecao', 'Está caro',
   'Reconheça a preocupação sem pressionar. Explique o que está incluído e compare com o valor de ser encontrado por novos clientes. Não ofereça desconto além do autorizado. Se o cliente ainda achar caro, respeite e deixe a porta aberta.', 60),
  ('objecao', 'Já tenho Instagram',
   'Valorize o Instagram. Explique que o site complementa: aparece em pesquisas, reúne informações essenciais em um endereço próprio e direciona para o WhatsApp e para o Instagram.', 70),
  ('objecao', 'Não preciso de site',
   'Pergunte, com curiosidade, como os clientes encontram a empresa hoje. Se fizer sentido, mostre um benefício concreto. Se o cliente mantiver que não precisa, agradeça e não insista.', 80),
  ('objecao', 'Vou pensar',
   'Respeite. Pergunte se ficou alguma dúvida específica e se pode ajudar com alguma informação. Não pressione nem crie urgência artificial.', 90),
  ('objecao', 'Preciso conversar com meu sócio',
   'Respeite. Ofereça um resumo curto da proposta para o cliente repassar ao sócio e se coloque à disposição para dúvidas.', 100),
  ('objecao', 'Quero ver exemplos',
   'Mostre apenas exemplos do portfólio autorizado listado na base de conhecimento. Se não houver nenhum, diga com sinceridade que a equipe vai enviar exemplos e passe para atendimento humano. Nunca invente clientes ou projetos.', 110),
  ('faq', 'Como funciona o pagamento?',
   'Use somente as condições de pagamento configuradas na oferta. Se não estiverem configuradas, diga que a equipe informa as condições e passe para atendimento humano.', 120),
  ('faq', 'Quanto tempo demora?',
   'Use somente o prazo configurado na oferta. Se não estiver configurado, diga que a equipe confirma o prazo conforme o material enviado pelo cliente.', 130);

-- -----------------------------------------------------------------------------
-- Conversas: papel do agente e resumo da necessidade
-- -----------------------------------------------------------------------------
alter table public.conversations
  add column agent_role text not null default 'sdr' check (agent_role in ('sdr', 'closer')),
  add column customer_summary text,
  add column handoff_reason text;

-- O painel pode ajustar o papel e o motivo de transferência; o resumo é do sistema.
create or replace function public.conversations_protect_ai_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.customer_summary is distinct from old.customer_summary then
    raise exception 'resumo do cliente é gerado pelo sistema';
  end if;
  return new;
end;
$$;

create trigger conversations_protect_ai_columns
  before update on public.conversations
  for each row execute function public.conversations_protect_ai_columns();

-- -----------------------------------------------------------------------------
-- Fila: novo tipo de tarefa e filtro por tipo
-- -----------------------------------------------------------------------------
alter table public.jobs drop constraint jobs_kind_check;
alter table public.jobs add constraint jobs_kind_check check (kind in (
  'campaign.start', 'scout.search', 'analyst.score', 'leads.classify', 'eligibility.check',
  'report.prepare', 'report.publish', 'maintenance.retention', 'sdr.reply'));

drop function public.claim_jobs(text, integer, integer);
create function public.claim_jobs(
  p_worker text,
  p_limit integer default 5,
  p_lock_timeout_seconds integer default 600,
  p_kinds text[] default null
)
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
        and (p_kinds is null or kind = any (p_kinds))
      order by run_after, created_at
      for update skip locked
      limit greatest(1, least(p_limit, 50)))
  returning j.*;
end;
$$;
revoke execute on function public.claim_jobs(text, integer, integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_jobs(text, integer, integer, text[]) to service_role;

-- Enfileira resposta do agente quando chega mensagem em conversa atendida pelo agente.
create or replace function public.enqueue_agent_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations%rowtype;
  s public.agent_settings%rowtype;
begin
  if new.direction <> 'inbound' or new.wa_message_id is null then
    return new;
  end if;
  select * into s from public.agent_settings where id = 1;
  select * into v_conv from public.conversations where id = new.conversation_id;
  if not s.ai_enabled or s.automation_paused or v_conv.agent_paused
     or v_conv.handled_by <> 'agente' or v_conv.opted_out_at is not null then
    return new;
  end if;
  insert into public.jobs (kind, payload, run_after, idempotency_key, max_attempts)
  values ('sdr.reply',
          jsonb_build_object('conversation_id', new.conversation_id, 'wamid', new.wa_message_id),
          now() + interval '8 seconds',  -- agrupa mensagens enviadas em sequência
          'sdr:' || new.wa_message_id,
          3)
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create trigger messages_enqueue_agent_reply
  after insert on public.messages
  for each row execute function public.enqueue_agent_reply();

revoke execute on function public.enqueue_agent_reply() from public, anon, authenticated;
revoke execute on function public.conversations_protect_ai_columns() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Ações do agente (executadas com service_role)
-- -----------------------------------------------------------------------------
create or replace function public.apply_agent_decision(
  p_conversation_id uuid,
  p_intent          text,
  p_next_stage      text,
  p_handoff         boolean,
  p_handoff_reason  text,
  p_agent_role      text,
  p_summary         text,
  p_opportunity     boolean,
  p_amount_cents    integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.conversations%rowtype;
  v_sale uuid;
begin
  select * into v from public.conversations where id = p_conversation_id for update;
  if not found then raise exception 'conversa não encontrada'; end if;

  update public.conversations
     set agent_role = coalesce(nullif(p_agent_role, ''), agent_role),
         customer_summary = coalesce(nullif(btrim(p_summary), ''), customer_summary),
         status = case when p_handoff then 'humano' else status end,
         handled_by = case when p_handoff then 'humano' else handled_by end,
         agent_paused = case when p_handoff or p_next_stage = 'perdido' then true else agent_paused end,
         handoff_reason = case when p_handoff then left(p_handoff_reason, 500) else handoff_reason end
   where id = p_conversation_id;

  if v.lead_id is not null and p_next_stage in ('interessado', 'proposta', 'perdido') then
    update public.leads
       set stage = p_next_stage::public.lead_stage,
           lost_reason = case when p_next_stage = 'perdido' then 'Sem interesse (informado na conversa)' else lost_reason end
     where id = v.lead_id
       and stage not in ('ganho', 'descartado')
       and not (stage = 'proposta' and p_next_stage = 'interessado');
  end if;

  -- Intenção de compra: registra oportunidade para APROVAÇÃO HUMANA (nunca aprovada pelo agente).
  if p_opportunity and p_amount_cents is not null and p_amount_cents > 0
     and not exists (select 1 from public.sales s where s.conversation_id = p_conversation_id and s.status = 'pendente_aprovacao') then
    insert into public.sales (lead_id, company_id, conversation_id, description, amount_cents, status, requested_by_agent, notes)
    values (v.lead_id, v.company_id, p_conversation_id,
            'Site profissional (oferta padrão) — solicitado na conversa',
            p_amount_cents, 'pendente_aprovacao', true, left(p_summary, 2000))
    returning id into v_sale;
  end if;

  return jsonb_build_object('sale_id', v_sale);
end;
$$;

revoke execute on function public.apply_agent_decision(uuid, text, text, boolean, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.apply_agent_decision(uuid, text, text, boolean, text, text, text, boolean, integer) to service_role;

-- Descadastro detectado pela IA (frases que as palavras-chave não pegaram).
create or replace function public.agent_opt_out(p_conversation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.conversations%rowtype;
begin
  select * into v from public.conversations where id = p_conversation_id;
  if not found then return; end if;
  insert into public.suppression_list (phone_e164, reason, source)
  values (v.phone_e164, left('Descadastro identificado pelo agente: ' || coalesce(p_reason, ''), 500), 'opt_out_message')
  on conflict (phone_e164) do nothing;
  update public.conversations set opted_out_at = coalesce(opted_out_at, now()), agent_paused = true where id = p_conversation_id;
end;
$$;
revoke execute on function public.agent_opt_out(uuid, text) from public, anon, authenticated;
grant execute on function public.agent_opt_out(uuid, text) to service_role;

-- >>> 20261118000100_phase4.sql
-- =============================================================================
-- Agency AI SDR — 0008 Fase 4: agenda, aprovação de vendas, notificações,
-- relatórios e templates (mensagens iniciadas pela empresa).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações de agenda e templates
-- -----------------------------------------------------------------------------
alter table public.agent_settings
  add column meeting_days smallint[] not null default '{1,2,3,4,5}',
  add column meeting_start time not null default '09:00',
  add column meeting_end time not null default '17:00',
  add column meeting_duration_min integer not null default 30 check (meeting_duration_min between 15 and 180),
  add column meeting_buffer_min integer not null default 15 check (meeting_buffer_min between 0 and 120),
  add column meeting_max_per_day integer not null default 4 check (meeting_max_per_day between 1 and 20),
  add column meeting_min_notice_hours integer not null default 4 check (meeting_min_notice_hours between 0 and 168),
  add column meeting_horizon_days integer not null default 10 check (meeting_horizon_days between 1 and 60),
  add column meeting_location text not null default 'Videochamada (link enviado pela equipe) ou telefone',
  add column template_min_days_between integer not null default 7 check (template_min_days_between between 1 and 90),
  add constraint agent_settings_meeting_hours_ck check (meeting_end > meeting_start);

-- -----------------------------------------------------------------------------
-- Agenda: somente uma PESSOA confirma reuniões
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column requested_by_agent boolean not null default false,
  add column confirmed_by uuid references auth.users (id) on delete set null,
  add column confirmed_at timestamptz,
  add column cancelled_reason text,
  add constraint appointments_confirmed_by_human_ck check (status not in ('confirmada', 'realizada') or confirmed_by is not null);

create or replace function public.appointments_enforce_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  s public.agent_settings%rowtype;
  v_count integer;
  v_day date;
begin
  if new.status = 'confirmada' and (tg_op = 'INSERT' or old.status is distinct from 'confirmada') then
    if auth.uid() is null then
      raise exception 'reuniões só podem ser confirmadas por uma pessoa da equipe';
    end if;
    if new.starts_at <= now() then
      raise exception 'não é possível confirmar reunião no passado';
    end if;
    select * into s from public.agent_settings where id = 1;
    v_day := (new.starts_at at time zone 'America/Sao_Paulo')::date;
    select count(*) into v_count
      from public.appointments a
     where a.status = 'confirmada'
       and a.id <> new.id
       and (a.starts_at at time zone 'America/Sao_Paulo')::date = v_day;
    if v_count >= s.meeting_max_per_day then
      raise exception 'limite de % reuniões por dia atingido em %', s.meeting_max_per_day, to_char(v_day, 'DD/MM/YYYY');
    end if;
    new.confirmed_by := auth.uid();
    new.confirmed_at := now();
  end if;
  if tg_op = 'UPDATE' and old.status in ('cancelada', 'realizada') and new.status is distinct from old.status then
    raise exception 'reunião % não pode mudar de situação', old.status;
  end if;
  return new;
end;
$$;

create trigger appointments_enforce_rules
  before insert or update on public.appointments
  for each row execute function public.appointments_enforce_rules();

-- Horários ocupados (para cálculo de disponibilidade): confirmadas e pedidos pendentes.
create or replace function public.busy_meeting_ranges(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.starts_at, a.ends_at, a.status
    from public.appointments a
   where a.status in ('confirmada', 'aguardando_aprovacao')
     and a.ends_at > p_from and a.starts_at < p_to;
$$;
revoke execute on function public.busy_meeting_ranges(timestamptz, timestamptz) from public, anon;
grant execute on function public.busy_meeting_ranges(timestamptz, timestamptz) to authenticated, service_role;

-- Pedido de reunião feito pelo agente (aguarda confirmação humana).
create or replace function public.request_meeting(p_conversation_id uuid, p_starts_at timestamptz, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.conversations%rowtype;
  s public.agent_settings%rowtype;
  v_id uuid;
begin
  select * into v from public.conversations where id = p_conversation_id;
  if not found then raise exception 'conversa não encontrada'; end if;
  select * into s from public.agent_settings where id = 1;
  if p_starts_at < now() + make_interval(hours => s.meeting_min_notice_hours) then
    raise exception 'horário sem a antecedência mínima';
  end if;
  if exists (select 1 from public.appointments a where a.status in ('confirmada', 'aguardando_aprovacao')
              and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_starts_at + make_interval(mins => s.meeting_duration_min), '[)')) then
    raise exception 'horário indisponível';
  end if;
  -- Um pedido pendente por conversa: substitui o anterior.
  update public.appointments set status = 'cancelada', cancelled_reason = 'Substituído por novo pedido do cliente'
   where conversation_id = p_conversation_id and status = 'aguardando_aprovacao';
  insert into public.appointments (lead_id, company_id, conversation_id, contact_name, phone_e164, starts_at, ends_at, reason, status, requested_by_agent)
  values (v.lead_id, v.company_id, p_conversation_id, coalesce(v.contact_name, 'Contato WhatsApp'), v.phone_e164,
          p_starts_at, p_starts_at + make_interval(mins => s.meeting_duration_min), left(p_reason, 500), 'aguardando_aprovacao', true)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.request_meeting(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.request_meeting(uuid, timestamptz, text) to service_role;

-- -----------------------------------------------------------------------------
-- Vendas: transições controladas, sempre por uma pessoa
-- -----------------------------------------------------------------------------
alter table public.sales
  add column rejected_reason text,
  add column decided_at timestamptz;

create or replace function public.sales_enforce_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    if new.amount_cents is distinct from old.amount_cents and old.status <> 'pendente_aprovacao' then
      raise exception 'o valor só pode ser alterado antes da aprovação';
    end if;
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'decisões sobre vendas exigem uma pessoa da equipe';
  end if;
  if not (
       (old.status = 'pendente_aprovacao' and new.status in ('aprovada', 'rejeitada', 'cancelada'))
    or (old.status = 'aprovada' and new.status in ('paga', 'cancelada'))
  ) then
    raise exception 'transição de venda inválida: % → %', old.status, new.status;
  end if;
  new.decided_at := now();
  if new.status = 'aprovada' then
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif new.status = 'paga' then
    new.payment_confirmed_by := auth.uid();
    new.payment_confirmed_at := now();
  elsif new.status = 'rejeitada' and coalesce(btrim(new.rejected_reason), '') = '' then
    raise exception 'informe o motivo da rejeição';
  end if;
  return new;
end;
$$;

create trigger sales_enforce_transition
  before update on public.sales
  for each row execute function public.sales_enforce_transition();

-- Funil: venda aprovada → lead "ganho"; rejeitada/cancelada antes do pagamento → "perdido".
create or replace function public.sales_after_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.lead_id is null or new.status is not distinct from old.status then return new; end if;
  if new.status = 'aprovada' then
    update public.leads set stage = 'ganho' where id = new.lead_id;
  elsif new.status in ('rejeitada', 'cancelada') then
    update public.leads set stage = 'perdido', lost_reason = coalesce(new.rejected_reason, 'Venda cancelada') where id = new.lead_id and stage <> 'ganho';
  end if;
  return new;
end;
$$;

create trigger sales_after_transition
  after update on public.sales
  for each row execute function public.sales_after_transition();

-- -----------------------------------------------------------------------------
-- Notificações para a equipe
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('handoff', 'oportunidade', 'reuniao', 'descadastro', 'relatorio', 'falha', 'limite')),
  title       text not null,
  body        text,
  link        text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  read_by     uuid references auth.users (id) on delete set null
);
create index notifications_unread_idx on public.notifications (created_at desc) where read_at is null;

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.notifications from authenticated;

create or replace function public.notify(p_kind text, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (kind, title, body, link) values (p_kind, left(p_title, 200), left(p_body, 1000), p_link);
$$;
revoke execute on function public.notify(text, text, text, text) from public, anon, authenticated;
grant execute on function public.notify(text, text, text, text) to service_role;

create or replace function public.mark_notifications_read(p_ids bigint[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if not public.is_staff() then raise exception 'permission denied' using errcode = '42501'; end if;
  update public.notifications set read_at = now(), read_by = auth.uid()
   where read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.mark_notifications_read(bigint[]) from public, anon;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;

create or replace function public.notify_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if tg_table_name = 'conversations' then
    if new.handled_by = 'humano' and old.handled_by is distinct from 'humano' and auth.uid() is null then
      perform public.notify('handoff', 'Conversa precisa de atendimento humano',
        coalesce(new.contact_name, new.phone_e164) || coalesce(': ' || new.handoff_reason, ''), '/conversas/' || new.id);
    end if;
  elsif tg_table_name = 'sales' then
    if tg_op = 'INSERT' and new.status = 'pendente_aprovacao' then
      select name into v_name from public.companies where id = new.company_id;
      perform public.notify('oportunidade', 'Nova oportunidade aguardando aprovação',
        coalesce(v_name, 'Contato') || ' — R$ ' || to_char(new.amount_cents / 100.0, 'FM999G990D00'), '/vendas');
    end if;
  elsif tg_table_name = 'appointments' then
    if tg_op = 'INSERT' and new.status = 'aguardando_aprovacao' then
      perform public.notify('reuniao', 'Pedido de reunião para confirmar',
        new.contact_name || ' — ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'), '/reunioes');
    end if;
  elsif tg_table_name = 'suppression_list' then
    if new.source = 'opt_out_message' then
      perform public.notify('descadastro', 'Contato pediu descadastro', new.phone_e164, '/configuracoes');
    end if;
  elsif tg_table_name = 'daily_reports' then
    if new.status = 'disponivel' and (tg_op = 'INSERT' or old.status is distinct from 'disponivel') then
      perform public.notify('relatorio', 'Relatório diário disponível', to_char(new.report_date, 'DD/MM/YYYY'), '/relatorios');
    end if;
  elsif tg_table_name = 'jobs' then
    if new.status = 'dead' and old.status is distinct from 'dead' then
      perform public.notify('falha', 'Tarefa falhou definitivamente', new.kind || ': ' || coalesce(new.last_error, ''), '/campanhas');
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_events() from public, anon, authenticated;

create trigger conversations_notify after update on public.conversations for each row execute function public.notify_events();
create trigger sales_notify after insert on public.sales for each row execute function public.notify_events();
create trigger appointments_notify after insert on public.appointments for each row execute function public.notify_events();
create trigger suppression_notify after insert on public.suppression_list for each row execute function public.notify_events();
create trigger daily_reports_notify after insert or update on public.daily_reports for each row execute function public.notify_events();
create trigger jobs_notify after update on public.jobs for each row execute function public.notify_events();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Templates (mensagens iniciadas pela empresa)
-- -----------------------------------------------------------------------------
create table public.whatsapp_templates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (name ~ '^[a-z0-9_]{1,512}$'),
  language            text not null default 'pt_BR' check (language ~ '^[a-z]{2}(_[A-Z]{2})?$'),
  category            text not null check (category in ('marketing', 'utility')),
  body_preview        text not null check (length(btrim(body_preview)) >= 10),
  param_count         integer not null default 0 check (param_count between 0 and 10),
  -- O administrador confirma que o template foi APROVADO pela Meta.
  approved_confirmed  boolean not null default false,
  active              boolean not null default true,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (name, language)
);
alter table public.whatsapp_templates enable row level security;
create policy whatsapp_templates_select on public.whatsapp_templates for select to authenticated using (public.is_staff());
create policy whatsapp_templates_write_admin on public.whatsapp_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger whatsapp_templates_audit after insert or update or delete on public.whatsapp_templates for each row execute function public.audit_row_change();

-- Conversa iniciada pela empresa: só para contatos com autorização válida.
create or replace function public.start_outbound_conversation(p_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.companies%rowtype;
  v_lead uuid;
  v_status public.contact_status;
  v_id uuid;
begin
  select * into c from public.companies where id = p_company_id;
  if not found then raise exception 'empresa não encontrada'; end if;
  select status into v_status from public.compute_whatsapp_eligibility(p_company_id);
  if v_status <> 'elegivel' then
    raise exception 'contato sem autorização válida para mensagem iniciada pela empresa (%)', v_status;
  end if;
  select id into v_lead from public.leads where company_id = p_company_id;
  insert into public.conversations (phone_e164, wa_id, company_id, lead_id, contact_name, status)
  values (c.phone_e164, ltrim(c.phone_e164, '+'), c.id, v_lead, c.name, 'aguardando_cliente')
  on conflict (phone_e164) where status <> 'encerrada' do nothing;
  select id into v_id from public.conversations where phone_e164 = c.phone_e164 and status <> 'encerrada';
  return v_id;
end;
$$;
revoke execute on function public.start_outbound_conversation(uuid) from public, anon, authenticated;
grant execute on function public.start_outbound_conversation(uuid) to service_role;

-- Registro de envio com tipo (texto ou template).
drop function public.register_outbound_message(uuid, text, text, uuid, text);
create function public.register_outbound_message(
  p_conversation_id uuid,
  p_body            text,
  p_sender          text,
  p_sent_by         uuid,
  p_idempotency_key text,
  p_message_type    text default 'text',
  p_template_name   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_existing public.messages%rowtype;
begin
  if p_sender not in ('humano', 'agente') then raise exception 'remetente inválido'; end if;
  if p_message_type not in ('text', 'template') then raise exception 'tipo inválido'; end if;
  if p_message_type = 'template' and p_sender <> 'humano' then
    raise exception 'somente a equipe inicia conversas com template';
  end if;
  if length(btrim(coalesce(p_body, ''))) = 0 or length(p_body) > 4096 then
    raise exception 'mensagem vazia ou acima de 4096 caracteres';
  end if;
  select * into v_existing from public.messages where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('message_id', v_existing.id, 'duplicate', true, 'status', v_existing.status);
  end if;
  insert into public.messages (conversation_id, direction, sender, message_type, body, template_name, status, sent_by, idempotency_key)
  values (p_conversation_id, 'outbound', p_sender, p_message_type, p_body, p_template_name, 'pendente', p_sent_by, p_idempotency_key)
  returning id into v_id;
  return jsonb_build_object('message_id', v_id, 'duplicate', false, 'status', 'pendente');
end;
$$;
revoke execute on function public.register_outbound_message(uuid, text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.register_outbound_message(uuid, text, text, uuid, text, text, text) to service_role;

-- Verificação de envio: agora com suporte a template (autorização + frequência mínima).
create or replace function public.whatsapp_send_check(
  p_conversation_id uuid,
  p_sender text default 'humano',
  p_kind   text default 'free_text'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s        public.agent_settings%rowtype;
  v        public.conversations%rowtype;
  v_reasons text[] := '{}';
  v_today  date := (now() at time zone 'America/Sao_Paulo')::date;
  v_sent   integer;
  v_elig   public.contact_status;
  v_last_template timestamptz;
begin
  if auth.uid() is not null and not public.can_operate() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into s from public.agent_settings where id = 1;
  select * into v from public.conversations where id = p_conversation_id;
  if not found then
    return jsonb_build_object('allowed', false, 'reasons', jsonb_build_array('Conversa não encontrada'));
  end if;

  if not s.whatsapp_enabled then
    v_reasons := array_append(v_reasons, 'Integração WhatsApp desativada nas Configurações');
  end if;
  if v.status = 'encerrada' then
    v_reasons := array_append(v_reasons, 'Conversa encerrada');
  end if;
  if v.opted_out_at is not null
     or exists (select 1 from public.suppression_list x where x.phone_e164 = v.phone_e164) then
    v_reasons := array_append(v_reasons, 'Contato descadastrado / na lista de bloqueio');
  end if;
  if exists (select 1 from public.companies c where c.id = v.company_id and c.is_demo) then
    v_reasons := array_append(v_reasons, 'Dado demonstrativo: nunca contatar');
  end if;
  if s.whatsapp_test_mode and not (v.phone_e164 = any (s.whatsapp_test_numbers)) then
    v_reasons := array_append(v_reasons, 'Modo de teste ativo: número fora da lista de testes');
  end if;

  if p_kind = 'free_text' then
    if v.service_window_expires_at is null or v.service_window_expires_at <= now() then
      v_reasons := array_append(v_reasons, 'Fora da janela de 24h de atendimento: só é permitido template aprovado');
    end if;
  elsif p_kind = 'template' then
    if p_sender <> 'humano' then
      v_reasons := array_append(v_reasons, 'Somente a equipe inicia conversas com template');
    end if;
    if v.company_id is null then
      v_reasons := array_append(v_reasons, 'Conversa sem empresa vinculada: autorização não verificável');
    else
      select status into v_elig from public.compute_whatsapp_eligibility(v.company_id);
      if v_elig <> 'elegivel' then
        v_reasons := array_append(v_reasons, 'Sem autorização válida para mensagem iniciada pela empresa');
      end if;
    end if;
    select max(m.created_at) into v_last_template
      from public.messages m
      join public.conversations c2 on c2.id = m.conversation_id
     where c2.phone_e164 = v.phone_e164 and m.message_type = 'template' and m.status <> 'falhou';
    if v_last_template is not null and v_last_template > now() - make_interval(days => s.template_min_days_between) then
      v_reasons := array_append(v_reasons, format('Template já enviado a este contato há menos de %s dias', s.template_min_days_between));
    end if;
  else
    v_reasons := array_append(v_reasons, 'Tipo de envio inválido');
  end if;

  if p_sender = 'agente' then
    if s.automation_paused then v_reasons := array_append(v_reasons, 'Automações pausadas (parada de emergência)'); end if;
    if not s.ai_enabled then v_reasons := array_append(v_reasons, 'Agente de IA desativado'); end if;
    if v.agent_paused or v.handled_by = 'humano' then v_reasons := array_append(v_reasons, 'Conversa sob atendimento humano'); end if;
  end if;

  select count(*) into v_sent
    from public.messages m
   where m.direction = 'outbound'
     and m.status <> 'falhou'
     and (m.created_at at time zone 'America/Sao_Paulo')::date = v_today;
  if v_sent >= s.whatsapp_daily_message_limit then
    v_reasons := array_append(v_reasons, format('Limite diário de mensagens atingido (%s)', s.whatsapp_daily_message_limit));
  end if;

  return jsonb_build_object(
    'allowed', cardinality(v_reasons) = 0,
    'reasons', to_jsonb(v_reasons),
    'window_expires_at', v.service_window_expires_at,
    'sent_today', v_sent,
    'daily_limit', s.whatsapp_daily_message_limit);
end;
$$;

-- -----------------------------------------------------------------------------
-- Relatórios: métricas por período (datas locais de São Paulo)
-- -----------------------------------------------------------------------------
create or replace function public.report_metrics(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := (p_from::timestamp at time zone 'America/Sao_Paulo');
  v_end   timestamptz := ((p_to + 1)::timestamp at time zone 'America/Sao_Paulo');
  r jsonb;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 366 then
    raise exception 'período inválido';
  end if;
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'companies_found', (select count(*) from public.companies where not is_demo and discovered_at >= v_start and discovered_at < v_end),
    'companies_without_site', (select count(*) from public.companies where not is_demo and discovered_at >= v_start and discovered_at < v_end and website_status in ('not_identified', 'social_only', 'verified_none')),
    'leads_scored', (select count(*) from public.leads where not is_demo and scored_at >= v_start and scored_at < v_end),
    'leads_qualified', (select count(*) from public.leads l join public.companies c on c.id = l.company_id where not l.is_demo and l.priority in ('alta', 'media') and c.discovered_at >= v_start and c.discovered_at < v_end),
    'authorized_contacts_new', (select count(*) from public.consents where granted_at >= v_start and granted_at < v_end),
    'conversations_new', (select count(*) from public.conversations where created_at >= v_start and created_at < v_end),
    'messages_received', (select count(*) from public.messages where direction = 'inbound' and created_at >= v_start and created_at < v_end),
    'agent_replies', (select count(*) from public.messages where sender = 'agente' and status <> 'falhou' and created_at >= v_start and created_at < v_end),
    'team_messages', (select count(*) from public.messages where sender = 'humano' and status <> 'falhou' and created_at >= v_start and created_at < v_end),
    'templates_sent', (select count(*) from public.messages where message_type = 'template' and status <> 'falhou' and created_at >= v_start and created_at < v_end),
    'handoffs', (select count(*) from public.notifications where kind = 'handoff' and created_at >= v_start and created_at < v_end),
    'opt_outs', (select count(*) from public.suppression_list where created_at >= v_start and created_at < v_end),
    'opportunities', (select count(*) from public.sales where created_at >= v_start and created_at < v_end),
    'sales_approved', (select count(*) from public.sales where approved_at >= v_start and approved_at < v_end),
    'sales_paid', (select count(*) from public.sales where payment_confirmed_at >= v_start and payment_confirmed_at < v_end),
    'revenue_cents', (select coalesce(sum(amount_cents), 0) from public.sales where status = 'paga' and payment_confirmed_at >= v_start and payment_confirmed_at < v_end),
    'meetings_requested', (select count(*) from public.appointments where created_at >= v_start and created_at < v_end),
    'meetings_confirmed', (select count(*) from public.appointments where confirmed_at >= v_start and confirmed_at < v_end),
    'cost_places_usd', (select coalesce(sum(estimated_cost_usd), 0) from public.usage_events where provider = 'google_places' and usage_date between p_from and p_to),
    'cost_ai_usd', (select coalesce(sum(estimated_cost_usd), 0) from public.usage_events where provider = 'anthropic' and usage_date between p_from and p_to),
    'cost_whatsapp_usd', (select coalesce(sum(estimated_cost_usd), 0) from public.usage_events where provider = 'whatsapp' and usage_date between p_from and p_to),
    'ai_tokens', (select coalesce(sum(input_tokens + output_tokens), 0) from public.usage_events where provider = 'anthropic' and usage_date between p_from and p_to)
  ) into r;
  return r;
end;
$$;
revoke execute on function public.report_metrics(date, date) from public, anon;
grant execute on function public.report_metrics(date, date) to authenticated, service_role;

-- >>> 20261119000100_hardening_monitoring.sql
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

commit;
