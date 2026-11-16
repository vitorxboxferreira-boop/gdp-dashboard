-- Fase 4 — agenda, vendas, notificações, templates e relatórios
\set ON_ERROR_STOP 1
begin;
do $$
declare
  v_company uuid; v_lead uuid; r jsonb; v_conv uuid; v_appt uuid; v_appt2 uuid; v_sale uuid; v_start timestamptz; n int; chk jsonb; v_out uuid;
begin
  insert into public.companies (source, place_id, name, city, phone_e164) values ('google_places', 'p4-1', 'Pet Shop P4', 'Livramento', '+5555999995555') returning id into v_company;
  insert into public.leads (company_id, score, priority, stage) values (v_company, 80, 'alta', 'interessado') returning id into v_lead;
  r := public.ingest_whatsapp_message('wamid.P4A', '555599995555', '+5555999995555', 'Carla', 'P', 'text', 'Quero marcar uma reunião', now());
  v_conv := (r ->> 'conversation_id')::uuid;
  -- Horários fixos no fuso de Brasília (evita depender da hora em que o teste roda)
  v_start := (((now() at time zone 'America/Sao_Paulo')::date + 3) + time '10:00') at time zone 'America/Sao_Paulo';

  -- ===== Agenda =====
  -- O agente registra PEDIDO (aguardando aprovação) e notifica a equipe
  v_appt := public.request_meeting(v_conv, v_start, 'Conhecer a proposta');
  if (select status from public.appointments where id = v_appt) <> 'aguardando_aprovacao' then raise exception 'FALHA: pedido'; end if;
  if not exists (select 1 from public.notifications where kind = 'reuniao') then raise exception 'FALHA: notificação de reunião'; end if;
  -- Horário ocupado não pode ser pedido de novo
  begin
    perform public.request_meeting(v_conv, v_start + interval '10 minutes', 'x');
    raise exception 'FALHA: pedido sobreposto aceito';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  -- Sem antecedência mínima
  begin
    perform public.request_meeting(v_conv, now() + interval '30 minutes', 'x');
    raise exception 'FALHA: sem antecedência aceito';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  -- Novo pedido da mesma conversa substitui o anterior
  v_appt2 := public.request_meeting(v_conv, v_start + interval '1 day', 'Outro horário');
  if (select status from public.appointments where id = v_appt) <> 'cancelada' then raise exception 'FALHA: pedido anterior não substituído'; end if;
  -- O sistema (sem usuário) NÃO confirma
  begin
    update public.appointments set status = 'confirmada' where id = v_appt2;
    raise exception 'FALHA: sistema confirmou reunião';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  -- Uma pessoa confirma
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  update public.appointments set status = 'confirmada' where id = v_appt2;
  if (select confirmed_by from public.appointments where id = v_appt2) is null then raise exception 'FALHA: confirmed_by'; end if;
  -- Limite por dia
  update public.agent_settings set meeting_max_per_day = 1 where id = 1;
  insert into public.appointments (contact_name, starts_at, ends_at, status)
  values ('Outro', v_start + interval '1 day 3 hours', v_start + interval '1 day 3 hours 30 minutes', 'proposta') returning id into v_appt;
  begin
    update public.appointments set status = 'confirmada' where id = v_appt;
    raise exception 'FALHA: limite diário de reuniões ignorado';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from public.busy_meeting_ranges(now(), now() + interval '10 days');
  if n < 1 then raise exception 'FALHA: busy ranges'; end if;

  -- ===== Vendas =====
  perform public.apply_agent_decision(v_conv, 'quer_contratar', 'proposta', true, 'aprovar', 'closer', 'Quer contratar.', true, 25000);
  select id into v_sale from public.sales where conversation_id = v_conv;
  if not exists (select 1 from public.notifications where kind = 'oportunidade') then raise exception 'FALHA: notificação de oportunidade'; end if;
  if not exists (select 1 from public.notifications where kind = 'handoff') then raise exception 'FALHA: notificação de handoff'; end if;
  -- Sistema não aprova
  begin
    update public.sales set status = 'aprovada' where id = v_sale;
    raise exception 'FALHA: sistema aprovou venda';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
  -- Não pode pular para "paga"
  begin
    update public.sales set status = 'paga' where id = v_sale;
    raise exception 'FALHA: pulou aprovação';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  update public.sales set status = 'aprovada' where id = v_sale;
  if (select approved_by from public.sales where id = v_sale) is null then raise exception 'FALHA: approved_by'; end if;
  if (select stage from public.leads where id = v_lead) <> 'ganho' then raise exception 'FALHA: lead não ganho'; end if;
  begin
    update public.sales set amount_cents = 1000 where id = v_sale;
    raise exception 'FALHA: valor alterado após aprovação';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  update public.sales set status = 'paga' where id = v_sale;
  if (select payment_confirmed_by from public.sales where id = v_sale) is null then raise exception 'FALHA: pagamento sem responsável'; end if;
  begin
    update public.sales set status = 'cancelada' where id = v_sale;
    raise exception 'FALHA: venda paga cancelada';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '', true);

  -- ===== Templates =====
  -- Sem autorização: não inicia conversa
  begin
    perform public.start_outbound_conversation(v_company);
    raise exception 'FALHA: conversa iniciada sem autorização';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  insert into public.consents (company_id, phone_e164, source, evidence, granted_at)
  values (v_company, '+5555999995555', 'formulario_site', 'Formulário do site com aceite, protocolo 123', now() - interval '1 day');
  update public.agent_settings set whatsapp_enabled = true, whatsapp_test_numbers = array['+5555999995555'] where id = 1;
  v_out := public.start_outbound_conversation(v_company);
  if v_out <> v_conv then raise exception 'FALHA: deveria reutilizar conversa aberta'; end if;
  chk := public.whatsapp_send_check(v_out, 'humano', 'template');
  if not (chk ->> 'allowed')::boolean then raise exception 'FALHA: template permitido esperado %', chk; end if;
  chk := public.whatsapp_send_check(v_out, 'agente', 'template');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: agente iniciou template'; end if;
  r := public.register_outbound_message(v_out, 'Olá Carla! ...', 'humano', null, 'tpl-1', 'template', 'boas_vindas');
  perform public.complete_outbound_message((r ->> 'message_id')::uuid, 'wamid.TPL1', null);
  chk := public.whatsapp_send_check(v_out, 'humano', 'template');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: frequência mínima de template ignorada'; end if;
  begin
    perform public.register_outbound_message(v_out, 'x', 'agente', null, 'tpl-2', 'template', 'boas_vindas');
    raise exception 'FALHA: agente registrou template';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- ===== Notificações: descadastro, relatório, falha =====
  perform public.ingest_whatsapp_message('wamid.P4B', '555599995555', '+5555999995555', 'Carla', 'P', 'text', 'PARAR', now(), true, false);
  if not exists (select 1 from public.notifications where kind = 'descadastro') then raise exception 'FALHA: notificação descadastro'; end if;
  insert into public.daily_reports (report_date, status) values (current_date, 'preparando');
  update public.daily_reports set status = 'disponivel' where report_date = current_date;
  if not exists (select 1 from public.notifications where kind = 'relatorio') then raise exception 'FALHA: notificação relatório'; end if;
  insert into public.jobs (kind, idempotency_key, status, attempts, max_attempts) values ('scout.search', 'p4-dead', 'running', 1, 1) returning id into v_out;
  perform public.fail_job(v_out, 'quebrou');
  if not exists (select 1 from public.notifications where kind = 'falha') then raise exception 'FALHA: notificação falha'; end if;

  -- ===== Relatório =====
  r := public.report_metrics((now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date);
  if (r ->> 'companies_found')::int <> 1 or (r ->> 'messages_received')::int <> 2 or (r ->> 'opportunities')::int <> 1
     or (r ->> 'sales_paid')::int <> 1 or (r ->> 'revenue_cents')::int <> 25000 or (r ->> 'templates_sent')::int <> 1
     or (r ->> 'meetings_confirmed')::int <> 1 or (r ->> 'opt_outs')::int <> 1 then
    raise exception 'FALHA: report_metrics %', r;
  end if;
  begin
    perform public.report_metrics((now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date - 1);
    raise exception 'FALHA: período inválido aceito';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;
rollback;

-- Acesso: viewer lê e marca notificações, não decide vendas
begin;
do $$
declare n int;
begin
  perform public.notify('limite', 'Teste', 'corpo', '/');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
  execute 'set local role authenticated';
  if (select count(*) from public.notifications) < 1 then raise exception 'FALHA: viewer não lê notificações'; end if;
  n := public.mark_notifications_read(null);
  if n < 1 then raise exception 'FALHA: marcar como lida'; end if;
  begin
    insert into public.notifications (kind, title) values ('limite', 'forjada');
    raise exception 'FALHA: viewer criou notificação';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.request_meeting(gen_random_uuid(), now() + interval '5 days', 'x');
    raise exception 'FALHA: authenticated pediu reunião via RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
\echo '  ✔ fase 4 ok'
