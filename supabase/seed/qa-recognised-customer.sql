-- ---------------------------------------------------------------------------
-- Dados de QA para o reconhecimento no totem — tenant Artorius.
--
-- Cria DUAS pessoas de propósito, porque os dois casos interessantes são
-- diferentes: uma cliente com crédito E oferta (o "uau" da demo) e um cliente
-- conhecido SEM nenhum benefício (o caso comum, e o que prova que a tela não
-- inventa vantagem quando não há).
--
-- Tudo marcado com metadata.seeded_by = 'chef-totem' para dar para apagar.
-- Idempotente: rodar de novo não duplica ninguém.
-- ---------------------------------------------------------------------------

do $$
declare
  v_tenant uuid := 'b296b800-6910-57ed-b084-6b59c9646154';
  v_marina uuid;
  v_rafael uuid;
  v_group uuid;
  v_account uuid;
  v_source uuid;
begin
  -- A PORTA DE ENTRADA É `people`, e só ela.
  --
  -- O plugin shop mantém um espelho de MÃO DUPLA: gravar em
  -- plg_shop_customers cria a pessoa com o MESMO id (before), e o gatilho
  -- dessa pessoa grava o cliente de volta (after) — que então colide com o
  -- INSERT original, ainda em voo. Entrando por `people` com kind='customer',
  -- o espelho desce uma vez só e o cliente nasce com o id da pessoa.
  select id into v_marina from people
   where tenant_id = v_tenant and phone = '11987651111' limit 1;
  if v_marina is null then
    insert into people (tenant_id, kind, name, email, phone, notes)
    values (v_tenant, 'customer', 'Marina Toledo', 'marina.qa@fayalabs.com', '11987651111',
            'seeded_by=chef-totem')
    returning id into v_marina;
  end if;

  select id into v_rafael from people
   where tenant_id = v_tenant and phone = '11987652222' limit 1;
  if v_rafael is null then
    insert into people (tenant_id, kind, name, phone, notes)
    values (v_tenant, 'customer', 'Rafael Nunes', '11987652222', 'seeded_by=chef-totem')
    returning id into v_rafael;
  end if;

  -- ---- O crédito da Marina, no razão -----------------------------------------
  --
  -- Dinheiro no razão, não um número numa coluna: uma conta de pessoa e um
  -- movimento que a credita. É assim que o Financeiro do ChefControl enxerga o
  -- mesmo saldo que o totem mostra.
  select id into v_account from plg_financial_accounts
   where tenant_id = v_tenant and kind = 'person' and person_id = v_marina limit 1;
  if v_account is null then
    insert into plg_financial_accounts (tenant_id, kind, name, person_id, is_active, metadata)
    values (v_tenant, 'person', 'Marina Toledo', v_marina, true,
            jsonb_build_object('seeded_by', 'chef-totem'))
    returning id into v_account;
  end if;

  -- Partida dobrada: creditar a Marina exige debitar ALGUÉM. A contrapartida é
  -- a conta de sistema da cortesia — é de lá que o dinheiro sai.
  select id into v_source from plg_financial_accounts
   where tenant_id = v_tenant and kind = 'system' and code = 'CORTESIA' limit 1;
  if v_source is null then
    insert into plg_financial_accounts (tenant_id, kind, code, name, is_active, metadata)
    values (v_tenant, 'system', 'CORTESIA', 'Cortesias e créditos', true,
            jsonb_build_object('seeded_by', 'chef-totem'))
    returning id into v_source;
  end if;

  if not exists (
    select 1 from plg_financial_movements
     where tenant_id = v_tenant and credit_account_id = v_account
       and metadata->>'seeded_by' = 'chef-totem'
  ) then
    -- `due_date` e `payment_date` são NOT NULL: um movimento sem data não é um
    -- lançamento, é um rascunho.
    insert into plg_financial_movements (tenant_id, movement_kind, status, amount, paid_amount,
                                         due_date, payment_date,
                                         debit_account_id, credit_account_id, notes, metadata)
    values (v_tenant, 'payment', 'confirmed', 18.00, 18.00,
            current_date, current_date, v_source, v_account,
            'Crédito de cortesia (QA totem)', jsonb_build_object('seeded_by', 'chef-totem'));
  end if;

  -- ---- O clube, e a oferta que pertence a ele --------------------------------
  select id into v_group from plg_shop_customer_groups
   where tenant_id = v_tenant and name = 'Clube Chef' limit 1;
  if v_group is null then
    insert into plg_shop_customer_groups (tenant_id, name, description, color)
    values (v_tenant, 'Clube Chef', 'Clientes recorrentes — oferta no totem', '#d7263d')
    returning id into v_group;
  end if;

  insert into plg_shop_customer_group_members (group_id, customer_id, tenant_id)
  select v_group, c.id, v_tenant from plg_shop_customers c
   where c.tenant_id = v_tenant and c.person_id = v_marina
  on conflict do nothing;

  if not exists (select 1 from plg_shop_discounts where tenant_id = v_tenant and code = 'CLUBE10') then
    -- No plugin shop `type` diz COMO o valor é lido (percentage | fixed_amount)
    -- e `method` diz COMO ele é reivindicado (code | automatic).
    insert into plg_shop_discounts (tenant_id, title, code, type, method, value, status,
                                    min_subtotal, applies_to, customer_group_id, once_per_customer)
    values (v_tenant, 'Clube Chef', 'CLUBE10', 'percentage', 'automatic', 10, 'active',
            30.00, 'order', v_group, false);
  else
    update plg_shop_discounts set customer_group_id = v_group, status = 'active'
     where tenant_id = v_tenant and code = 'CLUBE10';
  end if;
end $$;

select c.first_name, c.phone, coalesce(v.credit, 0) as credito, d.code as oferta
  from plg_shop_customers c
  left join v_financial_customer_credit v on v.person_id = c.person_id and v.tenant_id = c.tenant_id
  left join plg_shop_customer_group_members m on m.customer_id = c.id
  left join plg_shop_discounts d on d.customer_group_id = m.group_id and d.status = 'active'
 where c.tenant_id = 'b296b800-6910-57ed-b084-6b59c9646154'
   and c.phone in ('11987651111', '11987652222');
