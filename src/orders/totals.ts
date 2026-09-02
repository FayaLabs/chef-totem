import type { CustomerOffer } from '@/session/customer-lookup'

// ---------------------------------------------------------------------------
// O que o cliente paga, e por quê.
//
// A ORDEM importa e não é arbitrária: a oferta primeiro, o crédito depois. O
// crédito é dinheiro que a pessoa já tem; gastá-lo num valor que o desconto
// tiraria de graça é queimar saldo dela. Invertida, a mesma compra sai mais
// cara na próxima visita.
//
// Tudo em centavos e inteiro. Um `0.1 + 0.2` no total de um pedido vira uma
// diferença de um centavo entre a tela e a maquininha, e é a maquininha que
// ganha a discussão no balcão.
// ---------------------------------------------------------------------------

export interface OrderTotals {
  subtotalCents: number
  /** Desconto da oferta exclusiva. 0 quando não há oferta ou não atingiu o mínimo. */
  offerCents: number
  /** Crédito de fato consumido — nunca mais do que sobrou a pagar. */
  creditCents: number
  totalCents: number
}

export interface TotalsInput {
  subtotalCents: number
  offer?: CustomerOffer | null
  /** Saldo disponível. O consumido sai em `creditCents`. */
  availableCreditCents?: number
  /** Desligado quando o cliente escolhe guardar o saldo para a próxima. */
  useCredit?: boolean
}

export function offerDiscountCents(subtotalCents: number, offer?: CustomerOffer | null): number {
  if (!offer || subtotalCents <= 0) return 0
  if (subtotalCents < offer.minSubtotalCents) return 0

  const raw =
    offer.method === 'percentage'
      ? Math.round((subtotalCents * offer.value) / 100)
      : Math.round(offer.value * 100)

  return Math.max(0, Math.min(raw, subtotalCents))
}

export function computeTotals(input: TotalsInput): OrderTotals {
  const subtotalCents = Math.max(0, Math.round(input.subtotalCents))
  const offerCents = offerDiscountCents(subtotalCents, input.offer)
  const afterOffer = subtotalCents - offerCents

  const available = input.useCredit === false ? 0 : Math.max(0, Math.round(input.availableCreditCents ?? 0))
  const creditCents = Math.min(available, afterOffer)

  return { subtotalCents, offerCents, creditCents, totalCents: afterOffer - creditCents }
}

/** O rótulo que a tela mostra ao lado do desconto. */
export function offerLabel(offer: CustomerOffer): string {
  return offer.method === 'percentage' ? `${offer.value}% off` : `R$ ${offer.value.toFixed(2)} off`
}
