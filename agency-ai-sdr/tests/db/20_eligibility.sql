-- Testes de elegibilidade, autorizações, bloqueio e dados demonstrativos
\set ON_ERROR_STOP 1
begin;
do $$
declare
  v_demo uuid; v_lead_demo uuid; v_real uuid; v_lead uuid; v_status public.contact_status; v_cons uuid;
begin
  -- Demo: sempre 'demo', mesmo se tentar forçar
  select id into v_demo from public.companies where is_demo limit 1;
  insert into public.leads (company_id, contact_status) values (v_demo, 'elegivel') returning id into v_lead_demo;
  if (select contact_status from public.leads where id = v_lead_demo) <> 'demo' then
    raise exception 'FALHA: lead demo não ficou como demo';
  end if;
  update public.leads set contact_status = 'elegivel' where id = v_lead_demo;
  if (select contact_status from public.leads where id = v_lead_demo) <> 'demo' then
    raise exception 'FALHA: lead demo virou elegível';
  end if;
  begin
    insert into public.consents (company_id, phone_e164, source, evidence, granted_at)
    values (v_demo, '+5555999990000', 'presencial', 'teste de autorização demo', now());
    raise exception 'FALHA: autorização aceita para demo';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- Empresa real sem autorização: não contatável
  insert into public.companies (source, name, city, phone_e164, place_id)
  values ('google_places', 'Empresa Real Teste', 'Cidade', '+5555999991111', 'place_test_1') returning id into v_real;
  insert into public.leads (company_id) values (v_real) returning id into v_lead;
  v_status := public.refresh_lead_eligibility(v_lead);
  if v_status <> 'nao_contatavel' then raise exception 'FALHA: sem consentimento deveria ser nao_contatavel (%).', v_status; end if;

  -- Autorização futura é rejeitada
  begin
    insert into public.consents (company_id, phone_e164, source, evidence, granted_at)
    values (v_real, '+5555999991111', 'presencial', 'autorização com data futura', now() + interval '2 days');
    raise exception 'FALHA: autorização futura aceita';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- Com autorização válida: elegível
  insert into public.consents (company_id, phone_e164, source, evidence, granted_at)
  values (v_real, '+5555999991111', 'mensagem_recebida', 'Cliente enviou mensagem pedindo informações', now() - interval '1 day')
  returning id into v_cons;
  v_status := public.refresh_lead_eligibility(v_lead);
  if v_status <> 'elegivel' then raise exception 'FALHA: com consentimento deveria ser elegivel (%).', v_status; end if;

  -- Evidência é imutável
  begin
    update public.consents set evidence = 'alterada depois do fato' where id = v_cons;
    raise exception 'FALHA: evidência alterada';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- Descadastro: revoga autorização e bloqueia lead imediatamente
  insert into public.suppression_list (phone_e164, reason, source) values ('+5555999991111', 'Pediu para não receber mensagens', 'opt_out_message');
  if (select contact_status from public.leads where id = v_lead) <> 'bloqueado' then
    raise exception 'FALHA: lead não bloqueado após descadastro';
  end if;
  if (select revoked_at from public.consents where id = v_cons) is null then
    raise exception 'FALHA: autorização não revogada após descadastro';
  end if;
  if (select status from public.compute_whatsapp_eligibility(v_real)) <> 'bloqueado' then
    raise exception 'FALHA: compute deveria retornar bloqueado';
  end if;

  -- Nova autorização para telefone bloqueado é recusada
  begin
    insert into public.consents (company_id, phone_e164, source, evidence, granted_at)
    values (v_real, '+5555999991111', 'presencial', 'tentativa após descadastro', now());
    raise exception 'FALHA: autorização aceita para telefone bloqueado';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- Autorização revogada não pode ser reativada
  begin
    update public.consents set revoked_at = null where id = v_cons;
    raise exception 'FALHA: autorização revogada reativada';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;
rollback;
\echo '  ✔ elegibilidade ok'
