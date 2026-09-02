import { totemConfig } from '@/config/totem.config'
import { deviceClient } from '@/menu/device-session'
import type { CartLine } from '@/cart/useCart'
import type { ChargeResult } from '@/payment/driver'
import type { OrderTotals } from '@/orders/totals'
import type { ServiceMode, TotemCustomer } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// The order, written into the tables ChefControl already reads.
//
// No new table and no new column: `orders` + `order_items`, kind `dine_in`
// (declared in order_kinds by plugin-orders), with the totem's own facts in
// `metadata`. A kitchen screen that knows nothing about totems still sees the
// order; one that does can read metadata.totem.
//
// TODO(FAY-1447) — the two things that want a migration, both left as data so
// they are easy to promote later:
//
//   1. QUEUE NUMBER. public.next_sequence(tenant, kind) exists and is exactly
//      the right primitive, but it is a lifetime counter, not a daily one — so
//      the ticket would climb past #9999 and never reset at midnight. Until a
//      `daily` flavour exists, the sequence value is stored raw in metadata and
//      shown modulo 1000. The counter IS shared with the counter staff, which
//      was the actual risk; only the display is a compromise.
//
//   2. SERVICE MODE. dine_in vs takeaway is a real distinction for the kitchen
//      and, in Brazil, for tax. There is no column for it on orders, so it
//      rides in metadata.totem.service_mode and in the order's tags, where a
//      report can already filter on it.
// ---------------------------------------------------------------------------

export interface PlacedOrder {
  orderId: string
  ticket: string
  referenceNumber: string
  totalCents: number
}

export interface PlaceOrderInput {
  lines: CartLine[]
  mode: ServiceMode
  customer: TotemCustomer | null
  payment: ChargeResult
  method: string
  /** Subtotal, oferta e crédito, já calculados em `orders/totals.ts`. */
  totals?: OrderTotals
}

const money = (cents: number): number => Number((cents / 100).toFixed(2))

export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  // Cardápio de mentira, pedido de mentira. `demo` existe para a feira sem rede
  // e para o CI, e um catálogo demonstrativo que tenta gravar num tenant real
  // é incoerente das duas pontas: falha no estande e cria lixo no banco.
  if (import.meta.env.VITE_TOTEM_CATALOG === 'demo') return placeDemoOrder(input)

  const supabase = await deviceClient()
  const tenantId = totemConfig.tenantId
  const subtotalCents = input.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)
  // Sem descontos o pedido tem exatamente a forma que sempre teve; a coluna
  // `discount` fica em zero e nada a jusante precisa saber que existe oferta.
  const totals: OrderTotals = input.totals ?? {
    subtotalCents,
    offerCents: 0,
    creditCents: 0,
    totalCents: subtotalCents,
  }
  const totalCents = totals.totalCents

  // Shared with the counter: the same sequence the rest of the tenant draws
  // from, so two devices cannot mint the same number in one shift.
  const { data: sequenceValue, error: sequenceError } = await supabase.rpc('next_sequence', {
    p_tenant_id: tenantId,
    p_kind: 'totem_ticket',
  })
  if (sequenceError) throw new Error(`Senha não emitida: ${sequenceError.message}`)

  const raw = Number(sequenceValue ?? 0)
  const ticket = `#${String(raw % 1000).padStart(3, '0')}`
  const reference = `TOTEM-${String(raw).padStart(6, '0')}`

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      unit_id: totemConfig.unitId || null,
      kind: 'dine_in',
      // `confirmed`, not `draft`: the money is already taken, so the kitchen
      // must see it without anyone pressing anything.
      status: 'confirmed',
      reference_number: reference,
      subtotal: money(totals.subtotalCents),
      discount: money(totals.offerCents + totals.creditCents),
      total: money(totalCents),
      currency: totemConfig.currency,
      tags: ['totem', input.mode],
      notes: input.customer?.phone
        ? `Cliente: ${input.customer.phone}`
        : input.customer?.document
          ? `CPF: ${input.customer.document}`
          : null,
      metadata: {
        totem: {
          totem_id: totemConfig.totemId,
          service_mode: input.mode,
          ticket,
          ticket_sequence: raw,
          // A coluna `discount` guarda a soma; aqui fica de onde ela veio. Sem
          // isto o caixa vê "R$ 4,20 de desconto" e não sabe se foi crédito
          // consumido (dinheiro que sai do saldo do cliente) ou promoção.
          totals: {
            subtotal_cents: totals.subtotalCents,
            offer_cents: totals.offerCents,
            offer_code: input.customer?.offer?.code ?? null,
            credit_cents: totals.creditCents,
            total_cents: totals.totalCents,
          },
          payment: {
            method: input.method,
            status: input.payment.status,
            auth_code: input.payment.authCode ?? null,
            brand: input.payment.brand ?? null,
            nsu: input.payment.nsu ?? null,
            installments: input.payment.installments ?? 1,
          },
        },
      },
    })
    .select('id')
    .single()

  if (orderError) throw new Error(`Pedido não gravado: ${orderError.message}`)

  const { error: itemsError } = await supabase.from('order_items').insert(
    input.lines.map((line, index) => ({
      order_id: order.id as string,
      tenant_id: tenantId,
      unit_id: totemConfig.unitId || null,
      product_id: line.product.id,
      name: line.product.name,
      // The modifiers are what the kitchen actually has to do differently, so
      // they go in a column a printed ticket already shows, not only metadata.
      description: line.modifiers.length ? line.modifiers.map((m) => m.name).join(' · ') : null,
      quantity: line.quantity,
      unit_price: money(line.unitCents),
      total: money(line.unitCents * line.quantity),
      sort_order: index,
      metadata: { modifiers: line.modifiers.map((m) => ({ id: m.id, name: m.name })) },
    })),
  )

  if (itemsError) throw new Error(`Itens não gravados: ${itemsError.message}`)

  return { orderId: order.id as string, ticket, referenceNumber: reference, totalCents }
}

/** O pedido da feira: mesma forma, mesma tela, sem tocar em banco nenhum. */
let demoSequence = 0

function placeDemoOrder(input: PlaceOrderInput): PlacedOrder {
  // `?order=fail` força a pior falha do painel: o dinheiro saiu e o pedido não
  // gravou. É a costura de teste do mesmo formato de `?waiter=scripted`, e
  // existe porque esse caminho não pode ser coberto só quando a rede cai por
  // acaso — ele é o que decide se o cliente vai embora sabendo ou não que tem
  // de procurar o caixa.
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('order') === 'fail') {
    throw new Error('falha de gravação simulada')
  }
  demoSequence += 1
  const subtotalCents = input.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)
  return {
    orderId: `demo-${demoSequence}`,
    ticket: `#${String(demoSequence % 1000).padStart(3, '0')}`,
    referenceNumber: `DEMO-${String(demoSequence).padStart(6, '0')}`,
    totalCents: input.totals?.totalCents ?? subtotalCents,
  }
}
