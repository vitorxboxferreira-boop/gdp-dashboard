-- Fase 5 — verificações automáticas de segurança sobre TODO o schema public
\set ON_ERROR_STOP 1
do $$
declare r record; v_list text;
begin
  -- 1) RLS habilitado em todas as tabelas
  select string_agg(c.relname, ', ') into v_list
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_list is not null then raise exception 'FALHA: tabelas sem RLS: %', v_list; end if;

  -- 2) anon sem nenhum privilégio em tabelas, views e sequências
  select string_agg(c.relname || ':' || p.privilege_type, ', ') into v_list
    from pg_class c join pg_namespace n on n.oid = c.relnamespace,
         lateral (select unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) as privilege_type) p
   where n.nspname = 'public' and c.relkind in ('r','v','m')
     and has_table_privilege('anon', c.oid, p.privilege_type);
  if v_list is not null then raise exception 'FALHA: anon com privilégios: %', v_list; end if;

  -- 3) anon só executa funções inofensivas (helpers puros e checagens de papel que retornam false)
  select string_agg(p.proname, ', ') into v_list
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and has_function_privilege('anon', p.oid, 'EXECUTE')
     and p.prorettype <> 'trigger'::regtype
     and p.proname not in ('normalize_text', 'current_role_level', 'is_staff', 'can_operate', 'is_admin');
  if v_list is not null then raise exception 'FALHA: anon pode executar: %', v_list; end if;

  -- 4) Toda função SECURITY DEFINER fixa o search_path
  select string_agg(p.proname, ', ') into v_list
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%');
  if v_list is not null then raise exception 'FALHA: security definer sem search_path: %', v_list; end if;

  -- 5) Funções internas (fila, ingestão, decisões da IA) não executáveis por usuários do painel
  select string_agg(p.proname, ', ') into v_list
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('claim_jobs','complete_job','fail_job','defer_job','ingest_whatsapp_message','apply_whatsapp_status',
                       'register_outbound_message','complete_outbound_message','apply_agent_decision','agent_opt_out',
                       'request_meeting','start_outbound_conversation','notify','record_heartbeat','notify_limit_once',
                       'companies_pending_scoring')
     and has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v_list is not null then raise exception 'FALHA: authenticated executa função interna: %', v_list; end if;

  -- 6) Tabelas internas: authenticated não escreve
  for r in select unnest(array['jobs','usage_events','processed_events','daily_reports','audit_logs','notifications','system_heartbeats']) t loop
    if has_table_privilege('authenticated', 'public.' || r.t, 'INSERT') or has_table_privilege('authenticated', 'public.' || r.t, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || r.t, 'DELETE') then
      raise exception 'FALHA: authenticated escreve em %', r.t;
    end if;
  end loop;

  -- 7) Views respeitam as permissões de quem consulta
  select string_agg(c.relname, ', ') into v_list
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce((select bool_or(o = 'security_invoker=true') from unnest(c.reloptions) o), false);
  if v_list is not null then raise exception 'FALHA: views sem security_invoker: %', v_list; end if;
end $$;

-- 8) URLs perigosas e links externos em notificações são recusados pelo banco
begin;
do $$ begin
  begin
    insert into public.companies (source, name, city, website_uri) values ('manual', 'XSS', 'X', 'javascript:alert(1)');
    raise exception 'FALHA: javascript: aceito';
  exception when check_violation then null;
  end;
  begin
    perform public.notify('limite', 't', 'b', '//evil.example');
    raise exception 'FALHA: link externo em notificação aceito';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- 9) Monitoramento: batimentos e saúde
begin;
do $$
declare h jsonb;
begin
  h := public.system_health();
  if h ->> 'status' <> 'ok' then raise exception 'FALHA: saúde deveria estar ok sem piloto automático: %', h; end if;
  perform public.record_heartbeat('agent_runner', true, '{"processed": 2}');
  if (public.system_health() -> 'heartbeats' -> 'agent_runner' ->> 'ok')::boolean is not true then raise exception 'FALHA: heartbeat'; end if;
  insert into public.jobs (kind, idempotency_key, status, locked_at) values ('scout.search', 'stuck-1', 'running', now() - interval '1 hour');
  h := public.system_health();
  if h ->> 'status' <> 'degraded' or not (h -> 'issues' ->> 0) like '%travada%' then raise exception 'FALHA: tarefa travada não detectada %', h; end if;
  -- alerta de limite: uma vez por dia
  perform public.notify_limit_once('places', 'Limite do Google Places atingido', 'x');
  perform public.notify_limit_once('places', 'Limite do Google Places atingido', 'x');
  if (select count(*) from public.notifications where kind = 'limite') <> 1 then raise exception 'FALHA: alerta de limite duplicado'; end if;
end $$;
rollback;
\echo '  ✔ segurança e monitoramento ok'
