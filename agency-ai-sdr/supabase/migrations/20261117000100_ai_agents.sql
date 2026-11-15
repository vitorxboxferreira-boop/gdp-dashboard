-- =============================================================================
-- Agency AI SDR — 0007 Agentes de IA (Fase 3): SDR e Closer
-- Base de conhecimento, configurações da IA, fila de respostas e oportunidades.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações da IA
-- -----------------------------------------------------------------------------
alter table public.agent_settings
  add column agency_name text not null default '',
  add column assistant_name text not null default 'Assistente virtual',
  add column ai_effort text not null default 'low' check (ai_effort in ('low', 'medium', 'high')),
  add column ai_max_replies_per_conversation_day integer not null default 15
    check (ai_max_replies_per_conversation_day between 1 and 100),
  add column agent_hours_start time not null default '08:00',
  add column agent_hours_end time not null default '18:00',
  add column agent_days smallint[] not null default '{1,2,3,4,5}',
  add constraint agent_settings_hours_ck check (agent_hours_end > agent_hours_start);

-- -----------------------------------------------------------------------------
-- Base de conhecimento
-- -----------------------------------------------------------------------------
create table public.knowledge_base (
  id                       uuid primary key default gen_random_uuid(),
  kind                     text not null check (kind in ('servico', 'faq', 'objecao', 'condicao', 'limitacao', 'portfolio')),
  title                    text not null check (length(btrim(title)) between 3 and 200),
  content                  text not null check (length(btrim(content)) between 10 and 4000),
  url                      text,
  -- Portfólio: somente projetos reais com autorização do cliente para divulgação.
  client_authorized        boolean not null default false,
  authorization_note       text,
  active                   boolean not null default true,
  sort_order               integer not null default 100,
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint knowledge_portfolio_authorized_ck check (
    kind <> 'portfolio' or (client_authorized and url is not null and length(btrim(coalesce(authorization_note, ''))) >= 10)
  )
);

create index knowledge_base_active_idx on public.knowledge_base (active, kind, sort_order);

create trigger knowledge_base_set_updated_at
  before update on public.knowledge_base
  for each row execute function public.set_updated_at();

create trigger knowledge_base_audit
  after insert or update or delete on public.knowledge_base
  for each row execute function public.audit_row_change();

alter table public.knowledge_base enable row level security;
create policy knowledge_base_select on public.knowledge_base for select to authenticated using (public.is_staff());
create policy knowledge_base_write_admin on public.knowledge_base
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Conteúdo inicial: orientações honestas (sem depoimentos, clientes ou resultados inventados).
insert into public.knowledge_base (kind, title, content, sort_order) values
  ('servico', 'O que oferecemos',
   'Criação de um site profissional para empresas locais: uma página com as informações da empresa, catálogo de serviços ou produtos, endereço e localização, botão de contato pelo WhatsApp e layout adaptado para celular. O objetivo é a empresa ser encontrada e passar confiança a quem pesquisa na internet.', 10),
  ('servico', 'Por que ter um site além das redes sociais',
   'O site é um endereço próprio da empresa, que não depende do algoritmo de uma rede social, reúne em um só lugar serviços, preços, endereço e contato e pode ser compartilhado em qualquer lugar. Não substitui o Instagram: os dois se complementam.', 20),
  ('limitacao', 'O que NÃO está incluído no pacote inicial',
   'Domínio próprio (ex.: .com.br) e hospedagem têm custos à parte, informados pela equipe antes da contratação. Manutenção contínua após a entrega não está incluída. Não prometemos domínio grátis, hospedagem grátis nem manutenção vitalícia.', 30),
  ('limitacao', 'Sem garantia de resultados',
   'Não garantimos aumento de vendas, de clientes ou posição no Google. O site melhora a presença digital, mas os resultados dependem de vários fatores do negócio.', 40),
  ('limitacao', 'Limites do assistente virtual',
   'O assistente virtual não fecha contratos, não confirma pagamentos, não assina nada e não confirma reuniões sem a equipe. Quando o cliente quer contratar, marcar reunião ou pede algo fora do padrão, a equipe humana assume.', 50),
  ('objecao', 'Está caro',
   'Reconheça a preocupação sem pressionar. Explique o que está incluído e compare com o valor de ser encontrado por novos clientes. Não ofereça desconto além do autorizado. Se o cliente ainda achar caro, respeite e deixe a porta aberta.', 60),
  ('objecao', 'Já tenho Instagram',
   'Valorize o Instagram. Explique que o site complementa: aparece em pesquisas, reúne informações essenciais em um endereço próprio e direciona para o WhatsApp e para o Instagram.', 70),
  ('objecao', 'Não preciso de site',
   'Pergunte, com curiosidade, como os clientes encontram a empresa hoje. Se fizer sentido, mostre um benefício concreto. Se o cliente mantiver que não precisa, agradeça e não insista.', 80),
  ('objecao', 'Vou pensar',
   'Respeite. Pergunte se ficou alguma dúvida específica e se pode ajudar com alguma informação. Não pressione nem crie urgência artificial.', 90),
  ('objecao', 'Preciso conversar com meu sócio',
   'Respeite. Ofereça um resumo curto da proposta para o cliente repassar ao sócio e se coloque à disposição para dúvidas.', 100),
  ('objecao', 'Quero ver exemplos',
   'Mostre apenas exemplos do portfólio autorizado listado na base de conhecimento. Se não houver nenhum, diga com sinceridade que a equipe vai enviar exemplos e passe para atendimento humano. Nunca invente clientes ou projetos.', 110),
  ('faq', 'Como funciona o pagamento?',
   'Use somente as condições de pagamento configuradas na oferta. Se não estiverem configuradas, diga que a equipe informa as condições e passe para atendimento humano.', 120),
  ('faq', 'Quanto tempo demora?',
   'Use somente o prazo configurado na oferta. Se não estiver configurado, diga que a equipe confirma o prazo conforme o material enviado pelo cliente.', 130);

-- -----------------------------------------------------------------------------
-- Conversas: papel do agente e resumo da necessidade
-- -----------------------------------------------------------------------------
alter table public.conversations
  add column agent_role text not null default 'sdr' check (agent_role in ('sdr', 'closer')),
  add column customer_summary text,
  add column handoff_reason text;

-- O painel pode ajustar o papel e o motivo de transferência; o resumo é do sistema.
create or replace function public.conversations_protect_ai_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.customer_summary is distinct from old.customer_summary then
    raise exception 'resumo do cliente é gerado pelo sistema';
  end if;
  return new;
end;
$$;

create trigger conversations_protect_ai_columns
  before update on public.conversations
  for each row execute function public.conversations_protect_ai_columns();

-- -----------------------------------------------------------------------------
-- Fila: novo tipo de tarefa e filtro por tipo
-- -----------------------------------------------------------------------------
alter table public.jobs drop constraint jobs_kind_check;
alter table public.jobs add constraint jobs_kind_check check (kind in (
  'campaign.start', 'scout.search', 'analyst.score', 'leads.classify', 'eligibility.check',
  'report.prepare', 'report.publish', 'maintenance.retention', 'sdr.reply'));

drop function public.claim_jobs(text, integer, integer);
create function public.claim_jobs(
  p_worker text,
  p_limit integer default 5,
  p_lock_timeout_seconds integer default 600,
  p_kinds text[] default null
)
returns setof public.jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.jobs
     set status = case when attempts >= max_attempts then 'dead' else 'queued' end,
         locked_at = null, locked_by = null,
         last_error = coalesce(last_error, '') || ' [lock expirado]'
   where status = 'running'
     and locked_at < now() - make_interval(secs => p_lock_timeout_seconds);

  return query
  update public.jobs j
     set status = 'running',
         attempts = j.attempts + 1,
         locked_at = now(),
         locked_by = p_worker
   where j.id in (
     select id from public.jobs
      where status = 'queued' and run_after <= now()
        and (p_kinds is null or kind = any (p_kinds))
      order by run_after, created_at
      for update skip locked
      limit greatest(1, least(p_limit, 50)))
  returning j.*;
end;
$$;
revoke execute on function public.claim_jobs(text, integer, integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_jobs(text, integer, integer, text[]) to service_role;

-- Enfileira resposta do agente quando chega mensagem em conversa atendida pelo agente.
create or replace function public.enqueue_agent_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations%rowtype;
  s public.agent_settings%rowtype;
begin
  if new.direction <> 'inbound' or new.wa_message_id is null then
    return new;
  end if;
  select * into s from public.agent_settings where id = 1;
  select * into v_conv from public.conversations where id = new.conversation_id;
  if not s.ai_enabled or s.automation_paused or v_conv.agent_paused
     or v_conv.handled_by <> 'agente' or v_conv.opted_out_at is not null then
    return new;
  end if;
  insert into public.jobs (kind, payload, run_after, idempotency_key, max_attempts)
  values ('sdr.reply',
          jsonb_build_object('conversation_id', new.conversation_id, 'wamid', new.wa_message_id),
          now() + interval '8 seconds',  -- agrupa mensagens enviadas em sequência
          'sdr:' || new.wa_message_id,
          3)
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create trigger messages_enqueue_agent_reply
  after insert on public.messages
  for each row execute function public.enqueue_agent_reply();

revoke execute on function public.enqueue_agent_reply() from public, anon, authenticated;
revoke execute on function public.conversations_protect_ai_columns() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Ações do agente (executadas com service_role)
-- -----------------------------------------------------------------------------
create or replace function public.apply_agent_decision(
  p_conversation_id uuid,
  p_intent          text,
  p_next_stage      text,
  p_handoff         boolean,
  p_handoff_reason  text,
  p_agent_role      text,
  p_summary         text,
  p_opportunity     boolean,
  p_amount_cents    integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.conversations%rowtype;
  v_sale uuid;
begin
  select * into v from public.conversations where id = p_conversation_id for update;
  if not found then raise exception 'conversa não encontrada'; end if;

  update public.conversations
     set agent_role = coalesce(nullif(p_agent_role, ''), agent_role),
         customer_summary = coalesce(nullif(btrim(p_summary), ''), customer_summary),
         status = case when p_handoff then 'humano' else status end,
         handled_by = case when p_handoff then 'humano' else handled_by end,
         agent_paused = case when p_handoff or p_next_stage = 'perdido' then true else agent_paused end,
         handoff_reason = case when p_handoff then left(p_handoff_reason, 500) else handoff_reason end
   where id = p_conversation_id;

  if v.lead_id is not null and p_next_stage in ('interessado', 'proposta', 'perdido') then
    update public.leads
       set stage = p_next_stage::public.lead_stage,
           lost_reason = case when p_next_stage = 'perdido' then 'Sem interesse (informado na conversa)' else lost_reason end
     where id = v.lead_id
       and stage not in ('ganho', 'descartado')
       and not (stage = 'proposta' and p_next_stage = 'interessado');
  end if;

  -- Intenção de compra: registra oportunidade para APROVAÇÃO HUMANA (nunca aprovada pelo agente).
  if p_opportunity and p_amount_cents is not null and p_amount_cents > 0
     and not exists (select 1 from public.sales s where s.conversation_id = p_conversation_id and s.status = 'pendente_aprovacao') then
    insert into public.sales (lead_id, company_id, conversation_id, description, amount_cents, status, requested_by_agent, notes)
    values (v.lead_id, v.company_id, p_conversation_id,
            'Site profissional (oferta padrão) — solicitado na conversa',
            p_amount_cents, 'pendente_aprovacao', true, left(p_summary, 2000))
    returning id into v_sale;
  end if;

  return jsonb_build_object('sale_id', v_sale);
end;
$$;

revoke execute on function public.apply_agent_decision(uuid, text, text, boolean, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.apply_agent_decision(uuid, text, text, boolean, text, text, text, boolean, integer) to service_role;

-- Descadastro detectado pela IA (frases que as palavras-chave não pegaram).
create or replace function public.agent_opt_out(p_conversation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.conversations%rowtype;
begin
  select * into v from public.conversations where id = p_conversation_id;
  if not found then return; end if;
  insert into public.suppression_list (phone_e164, reason, source)
  values (v.phone_e164, left('Descadastro identificado pelo agente: ' || coalesce(p_reason, ''), 500), 'opt_out_message')
  on conflict (phone_e164) do nothing;
  update public.conversations set opted_out_at = coalesce(opted_out_at, now()), agent_paused = true where id = p_conversation_id;
end;
$$;
revoke execute on function public.agent_opt_out(uuid, text) from public, anon, authenticated;
grant execute on function public.agent_opt_out(uuid, text) to service_role;
