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
