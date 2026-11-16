-- Fase 2 — WhatsApp: idempotência, janela de 24h, descadastro, status, verificação de envio
\set ON_ERROR_STOP 1
begin;
do $$
declare
  r jsonb; v_conv uuid; v_company uuid; v_msg uuid; n int; chk jsonb;
begin
  -- Empresa real com lead (para vínculo automático pelo telefone)
  insert into public.companies (source, place_id, name, city, phone_e164)
  values ('google_places', 'wa-place-1', 'Oficina Cliente', 'Livramento', '+5555999992222') returning id into v_company;
  insert into public.leads (company_id, score, priority, stage) values (v_company, 80, 'alta', 'qualificado');

  -- 1) Recebimento
  r := public.ingest_whatsapp_message('wamid.IN1', '555599992222', '+5555999992222', 'João', 'PNID', 'text', 'Oi, quanto custa um site?', now() - interval '1 minute');
  if (r ->> 'duplicate')::boolean then raise exception 'FALHA: primeira mensagem marcada como duplicada'; end if;
  v_conv := (r ->> 'conversation_id')::uuid;
  if (select company_id from public.conversations where id = v_conv) <> v_company then raise exception 'FALHA: conversa não vinculada à empresa'; end if;
  if (select stage from public.leads where company_id = v_company) <> 'em_conversa' then raise exception 'FALHA: lead não foi para em_conversa'; end if;
  if (select service_window_expires_at from public.conversations where id = v_conv) < now() + interval '23 hours' then
    raise exception 'FALHA: janela de 24h não aberta';
  end if;
  -- Receber mensagem NÃO cria autorização para mensagens iniciadas pela empresa
  if exists (select 1 from public.consents where phone_e164 = '+5555999992222') then raise exception 'FALHA: autorização criada automaticamente'; end if;

  -- 2) Idempotência: mesmo wamid reenviado pela Meta
  r := public.ingest_whatsapp_message('wamid.IN1', '555599992222', '+5555999992222', 'João', 'PNID', 'text', 'Oi, quanto custa um site?', now());
  if not (r ->> 'duplicate')::boolean then raise exception 'FALHA: duplicata não detectada'; end if;
  select count(*) into n from public.messages where conversation_id = v_conv;
  if n <> 1 then raise exception 'FALHA: mensagem duplicada gravada (%)', n; end if;

  -- 3) Segunda mensagem: mesma conversa, contador de não lidas
  perform public.ingest_whatsapp_message('wamid.IN2', '555599992222', '+5555999992222', 'João', 'PNID', 'text', 'Tem exemplo?', now());
  if (select count(*) from public.conversations where phone_e164 = '+5555999992222') <> 1 then raise exception 'FALHA: conversa duplicada'; end if;
  if (select unread_count from public.conversations where id = v_conv) <> 2 then raise exception 'FALHA: unread_count'; end if;

  -- 4) Verificação de envio
  chk := public.whatsapp_send_check(v_conv, 'humano', 'free_text');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: envio permitido com WhatsApp desativado'; end if;
  if not (chk -> 'reasons') ? 'Integração WhatsApp desativada nas Configurações' then raise exception 'FALHA: motivo desativado ausente %', chk; end if;
  if not (chk -> 'reasons') ? 'Modo de teste ativo: número fora da lista de testes' then raise exception 'FALHA: motivo modo de teste ausente %', chk; end if;

  update public.agent_settings set whatsapp_enabled = true, whatsapp_test_numbers = array['+5555999992222'] where id = 1;
  chk := public.whatsapp_send_check(v_conv, 'humano', 'free_text');
  if not (chk ->> 'allowed')::boolean then raise exception 'FALHA: envio na janela deveria ser permitido %', chk; end if;

  -- Agente (Fase 3) continua bloqueado: IA desativada
  chk := public.whatsapp_send_check(v_conv, 'agente', 'free_text');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: agente pôde enviar com IA desativada'; end if;

  -- Template (mensagem iniciada pela empresa) bloqueado sem autorização
  chk := public.whatsapp_send_check(v_conv, 'humano', 'template');
  if not (chk -> 'reasons') ? 'Sem autorização válida para mensagem iniciada pela empresa' then raise exception 'FALHA: template sem autorização %', chk; end if;

  -- Fora da janela de 24h
  update public.conversations set service_window_expires_at = now() - interval '1 minute' where id = v_conv;
  chk := public.whatsapp_send_check(v_conv, 'humano', 'free_text');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: envio fora da janela permitido'; end if;
  update public.conversations set service_window_expires_at = now() + interval '1 hour' where id = v_conv;

  -- Limite diário
  update public.agent_settings set whatsapp_daily_message_limit = 0 where id = 1;
  chk := public.whatsapp_send_check(v_conv, 'humano', 'free_text');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: limite diário ignorado'; end if;
  update public.agent_settings set whatsapp_daily_message_limit = 50 where id = 1;

  -- 5) Registro de envio idempotente + status monotônico
  r := public.register_outbound_message(v_conv, 'Olá João! O site custa R$ 250,00.', 'humano', null, 'idem-1');
  v_msg := (r ->> 'message_id')::uuid;
  r := public.register_outbound_message(v_conv, 'Olá João! O site custa R$ 250,00.', 'humano', null, 'idem-1');
  if not (r ->> 'duplicate')::boolean or (r ->> 'message_id')::uuid <> v_msg then raise exception 'FALHA: envio duplicado por duplo clique'; end if;
  perform public.complete_outbound_message(v_msg, 'wamid.OUT1', null);
  if (select status from public.conversations where id = v_conv) <> 'aguardando_cliente' then raise exception 'FALHA: status da conversa após envio'; end if;
  perform public.apply_whatsapp_status('wamid.OUT1', 'read', now(), null);
  perform public.apply_whatsapp_status('wamid.OUT1', 'delivered', now(), null); -- chegou fora de ordem
  if (select status from public.messages where id = v_msg) <> 'lida' then raise exception 'FALHA: status regrediu'; end if;
  if public.apply_whatsapp_status('wamid.OUT1', 'failed', now(), 'x') then raise exception 'FALHA: lida virou falhou'; end if;

  -- 6) Pedido de atendimento humano
  perform public.ingest_whatsapp_message('wamid.IN3', '555599992222', '+5555999992222', 'João', 'PNID', 'text', 'Quero falar com um atendente', now(), false, true);
  if (select handled_by from public.conversations where id = v_conv) <> 'humano'
     or not (select agent_paused from public.conversations where id = v_conv) then
    raise exception 'FALHA: pedido de humano não pausou o agente';
  end if;

  -- 7) Descadastro imediato
  insert into public.consents (company_id, phone_e164, source, evidence, granted_at)
  values (v_company, '+5555999992222', 'mensagem_recebida', 'Cliente pediu orçamento e aceitou receber novidades', now() - interval '1 hour');
  perform public.ingest_whatsapp_message('wamid.IN4', '555599992222', '+5555999992222', 'João', 'PNID', 'text', 'PARAR', now(), true, false);
  if not exists (select 1 from public.suppression_list where phone_e164 = '+5555999992222') then raise exception 'FALHA: descadastro não registrado'; end if;
  if exists (select 1 from public.consents where phone_e164 = '+5555999992222' and revoked_at is null) then raise exception 'FALHA: autorização não revogada'; end if;
  if (select contact_status from public.leads where company_id = v_company) <> 'bloqueado' then raise exception 'FALHA: lead não bloqueado'; end if;
  chk := public.whatsapp_send_check(v_conv, 'humano', 'free_text');
  if (chk ->> 'allowed')::boolean then raise exception 'FALHA: envio permitido após descadastro'; end if;

  -- 8) Telefone desconhecido cria conversa sem empresa
  r := public.ingest_whatsapp_message('wamid.IN5', '5551988887777', '+5551988887777', null, 'PNID', 'image', null, now());
  if (select company_id from public.conversations where id = (r ->> 'conversation_id')::uuid) is not null then raise exception 'FALHA: vínculo indevido'; end if;
end $$;
rollback;

-- Proteções de acesso: operador não altera campos do sistema nem grava mensagens direto
begin;
do $$
declare v_conv uuid; r jsonb;
begin
  r := public.ingest_whatsapp_message('wamid.P1', '5555977776666', '+5555977776666', 'Ana', 'PNID', 'text', 'oi', now() - interval '2 days');
  v_conv := (r ->> 'conversation_id')::uuid;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
  execute 'set local role authenticated';
  begin
    update public.conversations set service_window_expires_at = now() + interval '1 day' where id = v_conv;
    raise exception 'FALHA: operador reabriu a janela de 24h';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  update public.conversations set handled_by = 'humano', agent_paused = true where id = v_conv; -- permitido
  begin
    insert into public.messages (conversation_id, direction, sender, body) values (v_conv, 'outbound', 'humano', 'x');
    raise exception 'FALHA: operador gravou mensagem direto';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ingest_whatsapp_message('wamid.P2', '1', '+5555977776666', 'x', 'p', 'text', 'x', now());
    raise exception 'FALHA: authenticated executou ingest';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
\echo '  ✔ whatsapp ok'
