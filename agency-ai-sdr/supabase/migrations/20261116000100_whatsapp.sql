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
