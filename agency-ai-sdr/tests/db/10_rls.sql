-- Testes de RLS e controle de acesso
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'operator@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'viewer@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'pending@test.local');

do $$ begin
  if (select count(*) from public.profiles where role = 'pending') <> 4 then
    raise exception 'FALHA: perfis devem nascer como pending';
  end if;
end $$;

-- Bootstrap pelo SQL Editor (sem auth.uid)
select public.grant_role('admin@test.local', 'admin');
select public.grant_role('operator@test.local', 'operator');
select public.grant_role('viewer@test.local', 'viewer');

-- pending: não vê nada
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.companies) <> 0 then raise exception 'FALHA: pending vê empresas'; end if;
  if (select count(*) from public.agent_settings) <> 0 then raise exception 'FALHA: pending vê configurações'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FALHA: pending deve ver apenas o próprio perfil'; end if;
  begin
    perform public.dashboard_metrics();
    raise exception 'FALHA: pending executou dashboard_metrics';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- viewer: lê, não escreve
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.companies) <> 5 then raise exception 'FALHA: viewer deveria ver 5 empresas demo'; end if;
  if (select count(*) from public.audit_logs) <> 0 then raise exception 'FALHA: viewer não pode ler auditoria'; end if;
  begin
    insert into public.companies (source, name) values ('manual', 'Teste Viewer');
    raise exception 'FALHA: viewer inseriu empresa';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_automation_paused(true, 'teste');
    raise exception 'FALHA: viewer pausou automações';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- operator: escreve dados operacionais, não altera configurações
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare n int;
begin
  insert into public.companies (source, name, city) values ('manual', 'Empresa Manual Teste', 'Cidade X');
  begin
    insert into public.companies (source, name, place_id) values ('google_places', 'Forjada', 'abc');
    raise exception 'FALHA: operator inseriu empresa como google_places';
  exception when insufficient_privilege then null;
  end;
  update public.agent_settings set daily_company_limit = 400 where id = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: operator alterou agent_settings'; end if;
  begin
    insert into public.jobs (kind, idempotency_key) values ('scout.search', 'x');
    raise exception 'FALHA: operator inseriu job';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.claim_jobs('w', 1, 60);
    raise exception 'FALHA: authenticated executou claim_jobs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.grant_role('viewer@test.local', 'admin');
    raise exception 'FALHA: operator alterou papel';
  exception when insufficient_privilege then null;
  end;
  -- pode pausar, não pode retomar
  perform public.set_automation_paused(true, 'teste operador');
  if not (select automation_paused from public.agent_settings) then raise exception 'FALHA: pausa não aplicada'; end if;
  begin
    perform public.set_automation_paused(false);
    raise exception 'FALHA: operator retomou automações';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- admin: altera configurações e lê auditoria
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare n int;
begin
  update public.agent_settings set daily_company_limit = 40 where id = 1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA: admin não alterou agent_settings'; end if;
  if (select count(*) from public.audit_logs where entity = 'agent_settings') < 1 then
    raise exception 'FALHA: alteração de configuração não auditada';
  end if;
  begin
    perform public.grant_role('admin@test.local', 'viewer');
    raise exception 'FALHA: admin se rebaixou';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- anon: sem acesso a tabelas
begin;
set local role anon;
do $$ begin
  begin
    perform 1 from public.companies limit 1;
    raise exception 'FALHA: anon leu companies';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.grant_role('anon@x', 'admin');
    raise exception 'FALHA: anon executou grant_role';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '  ✔ RLS ok'
