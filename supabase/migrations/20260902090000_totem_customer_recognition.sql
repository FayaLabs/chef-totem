-- ---------------------------------------------------------------------------
-- O totem reconhece um cliente pelo telefone — e nada além disso.
--
-- O usuário do aparelho tem catalog.read + orders.create e NADA sobre clientes.
-- Isso é deliberado: dar SELECT em plg_shop_customers a uma máquina parafusada
-- na parede significa que um totem roubado exporta a base inteira. Em vez disso
-- o painel ganha UMA função, que responde UMA pergunta sobre UM telefone por
-- vez, devolvendo uma projeção estreita de propósito: primeiro nome, crédito,
-- oferta. Sem e-mail, sem documento, sem sobrenome, sem histórico. Uma
-- credencial de totem vazada consegue sondar números um a um — o que é
-- limitável por taxa — não despejar a base.
--
-- SECURITY DEFINER aqui NÃO é o buraco de RPC-aberta-ao-anon que a auditoria do
-- pool de ecommerce achou em 31-08: exige um chamador autenticado que seja
-- membro do tenant sobre o qual pergunta.
--
-- TODO(FAY-1451): `plg_shop_discounts.customer_group_id` é assunto do plugin
-- shop, não do totem. Está aqui porque é aditivo, nulo por padrão e não muda o
-- comportamento de nenhum desconto existente — mas o lugar dele é na migration
-- do plugin, e a tela de descontos do ChefControl ainda não mostra o campo.
-- ---------------------------------------------------------------------------

-- Um telefone como o cliente digita e como foi importado quase nunca são a
-- mesma string. Chave = DDD + os 8 últimos dígitos, o que sobrevive ao +55, ao
-- nono dígito e a toda pontuação em uso.
create or replace function public.totem_phone_key(p_phone text)
returns text
language sql
immutable
as $$
  with d as (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as v),
       t as (select case when length(v) >= 12 and left(v, 2) = '55' then substr(v, 3) else v end as v from d)
  select case when length(v) < 10 then null else left(v, 2) || right(v, 8) end from t;
$$;

comment on function public.totem_phone_key(text) is
  'DDD + 8 ultimos digitos. Normaliza +55, o nono digito e a pontuacao.';

-- Uma oferta que pertence a um grupo de clientes. O plugin shop já sabe dizer O
-- QUE o desconto é (value, method, min_subtotal, applies_to) mas não PARA QUEM;
-- esta é a metade que faltava, aditiva e nula, então todo desconto existente
-- continua se comportando exatamente como antes.
alter table public.plg_shop_discounts
  add column if not exists customer_group_id uuid
  references public.plg_shop_customer_groups(id) on delete set null;

comment on column public.plg_shop_discounts.customer_group_id is
  'Restringe o desconto aos membros de um grupo. NULL = todo mundo, o comportamento anterior.';

create index if not exists plg_shop_discounts_customer_group_idx
  on public.plg_shop_discounts (tenant_id, customer_group_id)
  where customer_group_id is not null;

create index if not exists plg_shop_customers_phone_key_idx
  on public.plg_shop_customers (tenant_id, public.totem_phone_key(phone));

-- A busca do totem entra por `people`, não por `plg_shop_customers`.
create index if not exists people_phone_key_idx
  on public.people (tenant_id, public.totem_phone_key(phone));

create or replace function public.totem_customer_lookup(p_tenant_id uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := public.totem_phone_key(p_phone);
  v_customer record;
  v_credit numeric := 0;
  v_offer jsonb := null;
begin
  if auth.uid() is null or not public.is_tenant_member(p_tenant_id, auth.uid()) then
    raise exception 'not a member of this tenant' using errcode = '42501';
  end if;

  -- Um número curto demais para ser telefone não é erro, é simplesmente
  -- ninguém. O painel não pode distinguir "inválido" de "desconhecido" em voz
  -- alta: fazer isso transforma o teclado num oráculo de quais números são
  -- clientes.
  if v_key is null then
    return jsonb_build_object('found', false);
  end if;

  -- POR `people`, não por `plg_shop_customers`.
  --
  -- A primeira versão procurava na tabela do plugin de loja, e por isso não
  -- achava ninguém num RESTAURANTE: `shop_tenant_sells` é falso para quem não
  -- vende online, o espelho não roda e a tabela fica vazia. Um totem de
  -- restaurante que só reconhece cliente de e-commerce reconhece ninguém.
  --
  -- `people` é a espinha: existe em todo tenant, é o que o ChefControl edita, e
  -- é para onde o plugin de loja espelha quando existe.
  select p.id as person_id,
         split_part(btrim(coalesce(p.name, '')), ' ', 1) as first_name
    into v_customer
    from public.people p
   where p.tenant_id = p_tenant_id
     and p.merged_into_id is null
     and public.totem_phone_key(p.phone) = v_key
   order by p.updated_at desc nulls last
   limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(vc.credit, 0) into v_credit
    from public.v_financial_customer_credit vc
   where vc.tenant_id = p_tenant_id and vc.person_id = v_customer.person_id
   limit 1;

  select jsonb_build_object(
           'code', d.code,
           'title', d.title,
           -- `method` do painel = `type` do plugin. No shop, `type` diz COMO o
           -- valor é lido (percentage | fixed_amount) e `method` diz como o
           -- desconto é reivindicado (code | automatic). O totem só precisa do
           -- primeiro, e chamá-lo de `method` no cliente foi escolha minha —
           -- mapear aqui é mais barato que renomear o contrato do app.
           'method', d.type,
           'claim', d.method,
           'value', d.value,
           'min_subtotal_cents', round(coalesce(d.min_subtotal, 0) * 100)::int
         )
    into v_offer
    from public.plg_shop_discounts d
    join public.plg_shop_customer_group_members m
      on m.group_id = d.customer_group_id
    join public.plg_shop_customers c
      on c.id = m.customer_id and c.person_id = v_customer.person_id
   where d.tenant_id = p_tenant_id
     and d.status = 'active'
     and (d.starts_at is null or d.starts_at <= now())
     and (d.ends_at is null or d.ends_at >= now())
   order by d.value desc
   limit 1;

  return jsonb_build_object(
    'found', true,
    'first_name', v_customer.first_name,
    'credit_cents', greatest(0, round(coalesce(v_credit, 0) * 100)::int),
    'offer', v_offer
  );
end;
$$;

comment on function public.totem_customer_lookup(uuid, text) is
  'Um telefone entra, uma projecao estreita sai: primeiro nome, credito em centavos, a melhor oferta do grupo.';

revoke all on function public.totem_customer_lookup(uuid, text) from public;
grant execute on function public.totem_customer_lookup(uuid, text) to authenticated;
grant execute on function public.totem_phone_key(text) to authenticated;
