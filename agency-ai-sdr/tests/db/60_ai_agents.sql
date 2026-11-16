-- Fase 3 — agentes de IA: fila de respostas, decisões, oportunidades, base de conhecimento
\set ON_ERROR_STOP 1
begin;
do $$
declare v_company uuid; v_lead uuid; r jsonb; v_conv uuid; n int; v_job record;
begin
  insert into public.companies (source, place_id, name, city, phone_e164) values ('google_places', 'ai-1', 'Salão IA', 'Livramento', '+5555999994444') returning id into v_company;
  insert into public.leads (company_id, score, priority, stage) values (v_company, 80, 'alta', 'qualificado') returning id into v_lead;

  -- IA desligada: mensagem recebida NÃO gera tarefa de resposta
  r := public.ingest_whatsapp_message('wamid.AI1', '555599994444', '+5555999994444', 'Bia', 'P', 'text', 'Oi', now());
  v_conv := (r ->> 'conversation_id')::uuid;
  if exists (select 1 from public.jobs where kind = 'sdr.reply') then raise exception 'FALHA: tarefa criada com IA desligada'; end if;

  -- IA ligada: gera exatamente uma tarefa por mensagem (idempotente)
  update public.agent_settings set ai_enabled = true where id = 1;
  perform public.ingest_whatsapp_message('wamid.AI2', '555599994444', '+5555999994444', 'Bia', 'P', 'text', 'Quanto custa?', now());
  perform public.ingest_whatsapp_message('wamid.AI2', '555599994444', '+5555999994444', 'Bia', 'P', 'text', 'Quanto custa?', now());
  select count(*) into n from public.jobs where kind = 'sdr.reply';
  if n <> 1 then raise exception 'FALHA: esperado 1 tarefa sdr.reply, obtido %', n; end if;
  if (select payload ->> 'wamid' from public.jobs where kind = 'sdr.reply') <> 'wamid.AI2' then raise exception 'FALHA: payload'; end if;

  -- claim por tipo: não pega tarefas de outro tipo
  insert into public.jobs (kind, idempotency_key) values ('scout.search', 'ai-test-scout');
  update public.jobs set run_after = now() - interval '1 second';
  select count(*) into n from public.claim_jobs('w', 10, 600, array['sdr.reply']) j where j.kind <> 'sdr.reply';
  if n <> 0 then raise exception 'FALHA: claim por tipo pegou outro tipo'; end if;
  if (select status from public.jobs where idempotency_key = 'ai-test-scout') <> 'queued' then raise exception 'FALHA: scout reservado'; end if;

  -- Conversa sob atendimento humano: sem tarefa
  update public.conversations set handled_by = 'humano', agent_paused = true where id = v_conv;
  perform public.ingest_whatsapp_message('wamid.AI3', '555599994444', '+5555999994444', 'Bia', 'P', 'text', 'Oi?', now());
  if exists (select 1 from public.jobs where idempotency_key = 'sdr:wamid.AI3') then raise exception 'FALHA: tarefa com conversa humana'; end if;
  update public.conversations set handled_by = 'agente', agent_paused = false where id = v_conv;

  -- Decisão: interesse → estágio + papel Closer + resumo
  perform public.apply_agent_decision(v_conv, 'pediu_preco', 'interessado', false, '', 'closer', 'Salão quer site com agenda.', false, null);
  if (select stage from public.leads where id = v_lead) <> 'interessado' then raise exception 'FALHA: estágio interessado'; end if;
  if (select agent_role from public.conversations where id = v_conv) <> 'closer' then raise exception 'FALHA: papel closer'; end if;

  -- Quer contratar: oportunidade PENDENTE de aprovação (uma só) + humano assume
  perform public.apply_agent_decision(v_conv, 'quer_contratar', 'proposta', true, 'aprovar', 'closer', 'Quer contratar.', true, 25000);
  perform public.apply_agent_decision(v_conv, 'quer_contratar', 'proposta', true, 'aprovar', 'closer', 'Quer contratar.', true, 25000);
  select count(*) into n from public.sales where conversation_id = v_conv;
  if n <> 1 then raise exception 'FALHA: oportunidades duplicadas (%)', n; end if;
  if (select status from public.sales where conversation_id = v_conv) <> 'pendente_aprovacao' or (select approved_by from public.sales where conversation_id = v_conv) is not null then
    raise exception 'FALHA: venda não ficou pendente de aprovação';
  end if;
  if (select handled_by from public.conversations where id = v_conv) <> 'humano' then raise exception 'FALHA: humano não assumiu'; end if;
  -- "interessado" depois de "proposta" não regride
  perform public.apply_agent_decision(v_conv, 'duvida', 'interessado', false, '', 'closer', '', false, null);
  if (select stage from public.leads where id = v_lead) <> 'proposta' then raise exception 'FALHA: estágio regrediu'; end if;

  -- Descadastro pela IA
  perform public.agent_opt_out(v_conv, 'não quero mais');
  if not exists (select 1 from public.suppression_list where phone_e164 = '+5555999994444') then raise exception 'FALHA: opt-out IA'; end if;

  -- Portfólio exige autorização do cliente
  begin
    insert into public.knowledge_base (kind, title, content, url) values ('portfolio', 'Projeto X', 'Site para a padaria X, publicado em 2026.', 'https://x.example');
    raise exception 'FALHA: portfólio sem autorização aceito';
  exception when check_violation then null;
  end;
  insert into public.knowledge_base (kind, title, content, url, client_authorized, authorization_note)
  values ('portfolio', 'Projeto Y', 'Site para a padaria Y, publicado em 2026.', 'https://y.example', true, 'Autorizado por e-mail do dono em 10/11/2026');
end $$;
rollback;

-- Acesso à base de conhecimento e campos do sistema
begin;
do $$
declare v_conv uuid; r jsonb;
begin
  r := public.ingest_whatsapp_message('wamid.AIP', '5555977775555', '+5555977775555', 'X', 'P', 'text', 'oi', now());
  v_conv := (r ->> 'conversation_id')::uuid;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true); -- operador
  execute 'set local role authenticated';
  if (select count(*) from public.knowledge_base) < 10 then raise exception 'FALHA: operador não lê a base'; end if;
  begin
    insert into public.knowledge_base (kind, title, content) values ('faq', 'Teste', 'conteúdo de teste');
    raise exception 'FALHA: operador escreveu na base';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.conversations set customer_summary = 'editado' where id = v_conv;
    raise exception 'FALHA: operador editou resumo';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  begin
    perform public.apply_agent_decision(v_conv, 'x', 'proposta', false, '', 'sdr', '', true, 1);
    raise exception 'FALHA: authenticated aplicou decisão';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
\echo '  ✔ agentes de IA ok'
