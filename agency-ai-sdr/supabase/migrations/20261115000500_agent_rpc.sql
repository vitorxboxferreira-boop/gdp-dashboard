-- =============================================================================
-- Agency AI SDR — 0005 RPCs usadas pelos agentes (Scout/Analyst/orquestrador)
-- Executadas com service_role pelas Edge Functions ou por ações de servidor.
-- =============================================================================

-- Empresas que ainda não têm pontuação ou cuja pontuação ficou desatualizada.
create or replace function public.companies_pending_scoring(p_limit integer default 100)
returns table (
  id uuid,
  website_status public.website_status,
  website_uri text,
  primary_category text,
  types text[],
  phone_e164 text,
  formatted_address text,
  business_status text,
  rating numeric,
  user_rating_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.website_status, c.website_uri, c.primary_category, c.types, c.phone_e164,
         c.formatted_address, c.business_status, c.rating, c.user_rating_count
    from public.companies c
    left join public.leads l on l.company_id = c.id
   where l.id is null
      or l.scored_at is null
      or l.scored_at < c.updated_at
   order by c.discovered_at
   limit greatest(1, least(p_limit, 500));
$$;

-- Organiza leads após a pontuação: novos de alta/média prioridade viram "qualificado";
-- empresas permanentemente fechadas são descartadas.
create or replace function public.classify_leads()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qualified integer;
  v_discarded integer;
begin
  if auth.uid() is not null and not public.can_operate() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  update public.leads l
     set stage = 'qualificado'
   where l.stage = 'novo'
     and l.priority in ('alta', 'media');
  get diagnostics v_qualified = row_count;

  update public.leads l
     set stage = 'descartado', lost_reason = 'Empresa permanentemente fechada segundo a fonte'
    from public.companies c
   where c.id = l.company_id
     and c.business_status = 'CLOSED_PERMANENTLY'
     and l.stage in ('novo', 'qualificado');
  get diagnostics v_discarded = row_count;

  return jsonb_build_object('qualified', v_qualified, 'discarded', v_discarded);
end;
$$;

revoke execute on function public.companies_pending_scoring(integer) from public, anon, authenticated;
revoke execute on function public.classify_leads() from public, anon;
grant execute on function public.companies_pending_scoring(integer) to service_role;
grant execute on function public.classify_leads() to authenticated, service_role;
