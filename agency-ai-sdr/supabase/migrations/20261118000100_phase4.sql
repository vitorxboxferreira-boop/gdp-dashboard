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
