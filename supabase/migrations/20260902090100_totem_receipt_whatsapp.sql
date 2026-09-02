-- ---------------------------------------------------------------------------
-- "Quer receber no WhatsApp?" — o que acontece quando o cliente toca sim.
--
-- Mesma postura da função de reconhecimento: o aparelho NÃO ganha INSERT em
-- plg_conversations nem em plg_conversation_messages. Ganha uma função que
-- enfileira exatamente uma mensagem, sobre um pedido que ele acabou de gravar,
-- para o telefone que o cliente digitou.
--
-- A mensagem nasce `queued`, não `sent`, e isso é literal: enquanto o broker de
-- WhatsApp (FAY-1423) não estiver ligado neste tenant, a linha fica na caixa de
-- entrada do ChefControl esperando. A tela do totem diz "vai chegar", nunca
-- "enviado" — a diferença entre as duas frases é a diferença entre uma promessa
-- e uma mentira.
--
-- O opt-out é verificado ANTES de enfileirar. Quem pediu para não receber não
-- passa a receber porque comprou de novo.
-- ---------------------------------------------------------------------------

create or replace function public.totem_queue_receipt_whatsapp(
  p_tenant_id uuid,
  p_phone text,
  p_order_id uuid,
  p_body text,
  p_contact_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := public.totem_phone_key(p_phone);
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_e164 text;
  v_conversation uuid;
  v_message uuid;
  v_preview text;
begin
  if auth.uid() is null or not public.is_tenant_member(p_tenant_id, auth.uid()) then
    raise exception 'not a member of this tenant' using errcode = '42501';
  end if;

  if v_key is null then
    return jsonb_build_object('queued', false, 'reason', 'invalid_phone');
  end if;

  -- O pedido tem de ser deste tenant. Sem isto a função vira um jeito de mandar
  -- texto arbitrario para qualquer numero usando o id de qualquer pedido.
  if not exists (select 1 from public.orders o where o.id = p_order_id and o.tenant_id = p_tenant_id) then
    return jsonb_build_object('queued', false, 'reason', 'unknown_order');
  end if;

  v_e164 := '+55' || case when length(v_digits) >= 12 and left(v_digits, 2) = '55'
                          then substr(v_digits, 3) else v_digits end;

  if exists (
    select 1 from public.plg_conversations_optouts x
     where x.tenant_id = p_tenant_id and x.channel = 'whatsapp'
       and public.totem_phone_key(x.phone_e164) = v_key
  ) then
    return jsonb_build_object('queued', false, 'reason', 'opted_out');
  end if;

  v_preview := left(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g'), 120);

  select c.id into v_conversation
    from public.plg_conversations c
   where c.tenant_id = p_tenant_id and c.channel = 'whatsapp'
     and public.totem_phone_key(c.contact_handle) = v_key
   order by c.updated_at desc nulls last
   limit 1;

  if v_conversation is null then
    insert into public.plg_conversations (tenant_id, contact_name, contact_handle, channel,
                                          last_message_preview, last_message_at, unread_count, status, tags)
    values (p_tenant_id, coalesce(p_contact_name, v_e164), v_e164, 'whatsapp',
            v_preview, now(), 0, 'open', array['totem'])
    returning id into v_conversation;
  else
    update public.plg_conversations
       set last_message_preview = v_preview, last_message_at = now(), updated_at = now(),
           contact_name = coalesce(contact_name, p_contact_name)
     where id = v_conversation;
  end if;

  insert into public.plg_conversation_messages (tenant_id, conversation_id, channel, direction, body,
                                                author, at, delivery_status, sender_kind, sender_label,
                                                subject_type, subject_id)
  values (p_tenant_id, v_conversation, 'whatsapp', 'out', p_body,
          'totem', now(), 'queued', 'system', 'Totem',
          'order', p_order_id::text)
  returning id into v_message;

  return jsonb_build_object('queued', true, 'conversation_id', v_conversation,
                            'message_id', v_message, 'to', v_e164);
end;
$$;

comment on function public.totem_queue_receipt_whatsapp(uuid, text, uuid, text, text) is
  'Enfileira UMA mensagem de recibo para o telefone do cliente, sobre um pedido deste tenant. Respeita opt-out. Nasce queued.';

revoke all on function public.totem_queue_receipt_whatsapp(uuid, text, uuid, text, text) from public;
grant execute on function public.totem_queue_receipt_whatsapp(uuid, text, uuid, text, text) to authenticated;
