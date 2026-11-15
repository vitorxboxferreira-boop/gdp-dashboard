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
