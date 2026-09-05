import {
  PAYMENT_METHODS, addLines, openOrder, setStatus, settle,
  type OrderContext, type OrderLine,
} from '@fayz-ai/core/orders'
import { totemConfig } from '@/config/totem.config'
import { deviceClient } from '@/menu/device-session'
import type { CartLine } from '@/cart/useCart'
import type { ChargeResult, PaymentMethod } from '@/payment/driver'
import type { OrderTotals } from '@/orders/totals'
import type { ServiceMode, TotemCustomer } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// A venda do quiosque, pela mesma estrada do caixa.
//
// A sequência em si mora em `@fayz-ai/core/orders`, compartilhada com o PDV:
// abrir → completar (que levanta a fatura, por gatilho do cluster) → baixar a
// parcela. Este arquivo é só a parte que é genuinamente TOTEM: uma senha que o
// balcão também puxa, e uma cozinha que ainda tem de fazer a comida depois que
// o dinheiro já entrou.
//
// O totem não escreve fatura nem movimento nenhum. Antes ele não escrevia
// nenhum dos dois, que era a outra metade do mesmo problema: a venda do
// quiosque chegava em `orders` e parava ali, então um dia de totem era
// invisível para o Financeiro. Completar o pedido é o que levanta o recebível,
// na mesma transação, e `settle` baixa o pagamento contra ele.
//
// TODO(FAY-1447) — a senha. public.next_sequence(tenant, kind) é a primitiva
// certa mas é um contador VITALÍCIO, não diário, então a senha passaria de
// #9999 e nunca voltaria à meia-noite. Enquanto não existir um sabor `daily`, o
// valor cru fica em metadata e só a EXIBIÇÃO é módulo 1000. O contador É
// compartilhado com o balcão, que era o risco de verdade.
// ---------------------------------------------------------------------------

export interface PlacedOrder {
  orderId: string
  ticket: string
  /** O número da fatura, quando a venda gerou uma; senão a referência do totem. */
  referenceNumber: string
  totalCents: number
  /** Falso quando a venda fechou mas o dinheiro não foi baixado. */
  paid: boolean
  warning?: string
}

export interface PlaceOrderInput {
  lines: CartLine[]
  mode: ServiceMode
  customer: TotemCustomer | null
  payment: ChargeResult
  method: PaymentMethod
  /** Subtotal, oferta e crédito, já calculados em `orders/totals.ts`. */
  totals?: OrderTotals
}

/** Uma linha do carrinho nas palavras da porta compartilhada. */
const asLine = (line: CartLine): OrderLine => ({
  id: line.id,
  productId: line.product.id,
  name: line.product.name,
  quantity: line.quantity,
  unitPriceCents: line.unitCents,
  // O que a cozinha tem de fazer diferente, numa coluna que a comanda impressa
  // já mostra — não só em metadata.
  ...(line.modifiers.length
    ? { description: line.modifiers.map((m) => m.name).join(' · ') }
    : {}),
  metadata: { modifiers: line.modifiers.map((m) => ({ id: m.id, name: m.name })) },
})

/**
 * Oferta e crédito viram LINHAS negativas, não uma coluna `discount` no
 * cabeçalho.
 *
 * O cluster apura a fatura a partir das linhas do pedido, e desde que a fatura
 * fechada passou a copiá-las, um abatimento que só existisse no cabeçalho daria
 * uma fatura cujo total não bate com a soma das próprias linhas. De onde veio
 * cada centavo continua em `metadata.totem.totals`.
 */
function discountLines(orderId: string, totals: OrderTotals, customer: TotemCustomer | null): OrderLine[] {
  const out: OrderLine[] = []
  if (totals.offerCents > 0) {
    out.push({
      id: `offer-${orderId}`,
      name: customer?.offer?.title ?? 'Oferta',
      quantity: 1,
      unitPriceCents: -totals.offerCents,
      metadata: { discount: 'offer', code: customer?.offer?.code ?? null },
    })
  }
  if (totals.creditCents > 0) {
    out.push({
      id: `credit-${orderId}`,
      name: 'Crédito do cliente',
      quantity: 1,
      unitPriceCents: -totals.creditCents,
      metadata: { discount: 'credit' },
    })
  }
  return out
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  // Cardápio de mentira, pedido de mentira. `demo` existe para a feira sem rede
  // e para o CI, e um catálogo demonstrativo que tenta gravar num tenant real
  // é incoerente das duas pontas: falha no estande e cria lixo no banco.
  if (import.meta.env.VITE_TOTEM_CATALOG === 'demo') return placeDemoOrder(input)

  const db = await deviceClient()
  const ctx: OrderContext = {
    db,
    tenantId: totemConfig.tenantId,
    ...(totemConfig.unitId ? { unitId: totemConfig.unitId } : {}),
    source: `chef-totem:${totemConfig.totemId}`,
  }

  const subtotalCents = input.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)
  // Sem descontos o pedido tem exatamente a forma que sempre teve.
  const totals: OrderTotals = input.totals ?? {
    subtotalCents,
    offerCents: 0,
    creditCents: 0,
    totalCents: subtotalCents,
  }

  // Compartilhada com o balcão: a mesma sequência de que o resto do tenant
  // puxa, então dois aparelhos não cunham o mesmo número num turno.
  const { data: sequenceValue, error: sequenceError } = await db.rpc('next_sequence', {
    p_tenant_id: ctx.tenantId,
    p_kind: 'totem_ticket',
  })
  if (sequenceError) throw new Error(`Senha não emitida: ${sequenceError.message}`)

  const raw = Number(sequenceValue ?? 0)
  const ticket = `#${String(raw % 1000).padStart(3, '0')}`
  const reference = `TOTEM-${String(raw).padStart(6, '0')}`

  // `takeout`, não `dine_in`: dine_in é a comanda do salão, e o PDV lê toda
  // dine_in aberta como uma mesa sendo servida — uma venda de quiosque
  // arquivada ali apareceria no salão como comanda sem mesa.
  const orderId = await openOrder(ctx, {
    kind: 'takeout',
    // O dinheiro já foi cobrado, então o pedido não é rascunho que alguém tenha
    // de confirmar — mas também não acabou: a comida ainda tem de ser feita.
    status: 'confirmed',
    // `orders_channel_check` só aceita balcao | shop | dine_in | delivery. O
    // canal é ONDE a venda aconteceu, não o nome do app; quem foi o aparelho
    // fica em `metadata.source`, que a porta compartilhada carimba sozinha.
    channel: 'balcao',
    lines: input.lines.map(asLine),
    notes: input.customer?.phone
      ? `Cliente: ${input.customer.phone}`
      : input.customer?.document
        ? `CPF: ${input.customer.document}`
        : undefined,
    metadata: {
      totem: {
        totem_id: totemConfig.totemId,
        // dine_in vs takeaway é uma distinção real para a cozinha e, no Brasil,
        // para o fisco. Não há coluna para isso, então anda aqui.
        service_mode: input.mode,
        ticket,
        ticket_sequence: raw,
        reference,
        // As linhas de desconto dizem QUANTO; isto diz de onde veio. Sem ele o
        // caixa vê "− R$ 4,20" e não sabe se foi crédito consumido (dinheiro
        // que sai do saldo do cliente) ou promoção.
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
    // Um toque duplo numa cobrança aprovada tem de devolver a MESMA venda, não
    // abrir uma segunda que a cozinha faria duas vezes.
    idempotencyKey: `totem:${totemConfig.totemId}:${raw}`,
  })

  const extra = discountLines(orderId, totals, input.customer)
  if (extra.length > 0) await addLines(ctx, orderId, extra)

  let referenceNumber = reference
  let paid = true
  let warning: string | undefined

  if (totals.totalCents <= 0) {
    // Conta zerada pelo crédito do próprio cliente: não há nada a receber, e o
    // cluster não levanta recebível de total zero. Fechar sem fatura aqui é o
    // registro correto, não uma falha.
    await setStatus(ctx, orderId, 'completed')
  } else {
    const result = await settle(ctx, orderId, {
      method: PAYMENT_METHODS[input.method] ?? 'other',
      // Este painel não tem gaveta: um quiosque que abre caixinha está
      // registrando dinheiro que ninguém contou. Crédito, débito e Pix liquidam
      // cada um na sua conta.
      openCashSession: false,
    })
    referenceNumber = result.invoice.number
    paid = result.paid
    warning = result.warning
  }

  // Completar é o fechamento CONTÁBIL, e o cluster registra isso em
  // `orders.stage = 'invoiced'`. A comida ainda tem de ser feita, então o
  // status — que é o eixo de atendimento, e o que uma tela de cozinha observa —
  // segue para onde a comanda realmente está. Falhar aqui perde a comanda da
  // cozinha, nunca o dinheiro, então se diz em voz alta em vez de desfazer uma
  // venda já liquidada.
  try {
    await setStatus(ctx, orderId, 'preparing')
  } catch (cause) {
    const said = cause instanceof Error ? cause.message : String(cause)
    warning = [warning, `A cozinha não foi avisada — mostre a senha ${ticket} no balcão. (${said})`]
      .filter(Boolean)
      .join(' ')
  }

  return {
    orderId,
    ticket,
    referenceNumber,
    totalCents: totals.totalCents,
    paid,
    ...(warning ? { warning } : {}),
  }
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
    paid: true,
  }
}
