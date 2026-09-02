import { brl, cartTotalCents, cartCount, useCart } from '@/cart/useCart'
import { draftBlocking, useProductDraft, type DraftBlocking } from '@/menu/useProductDraft'
import { useMenuUi } from '@/menu/useMenuUi'
import { useTotemSession, type ServiceMode, type TotemStep } from '@/session/useTotemSession'
import type { TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// What the waiter can see, right now.
//
// Built fresh on every turn, never cached: the customer's hands are moving at
// the same time the model is thinking, and a stale snapshot is how an
// assistant confidently describes a cart that changed two taps ago.
//
// It is deliberately small and PROSE-shaped rather than a dump of the stores.
// A model reading "falta escolher: Ponto da carne" acts; a model reading the
// raw `chosen` record has to infer the same thing and sometimes gets it wrong.
// ---------------------------------------------------------------------------

export interface WaiterSnapshot {
  step: TotemStep
  mode: ServiceMode | null
  ticket: string | null
  /**
   * Quem está do outro lado, quando ele se identificou.
   *
   * Faltava, e a falta aparecia na cara: o painel sabia o nome da pessoa e o
   * garçom continuava dizendo "bom dia" para um estranho. Pior, ele não sabia
   * do crédito nem da oferta — as duas coisas que mais mudam o que vale a pena
   * sugerir.
   */
  customer: {
    name: string | null
    credit: string | null
    offer: string | null
  }
  cart: {
    count: number
    total: string
    lines: { id: string; name: string; quantity: number; modifiers: string[]; total: string }[]
  }
  openProduct?: {
    id: string
    name: string
    price: string
    quantity: number
    chosen: { group: string; options: string[] }[]
  }
  /** What stops the open item from being added. The reason to speak up. */
  blocking?: DraftBlocking
  categoryOpen: string | null
  cartSheetOpen: boolean
}

export function buildSnapshot(catalog: TotemCatalog | null): WaiterSnapshot {
  const session = useTotemSession.getState()
  const cart = useCart.getState()
  const menuUi = useMenuUi.getState()
  const draft = useProductDraft.getState()

  const product = catalog?.products.find((p) => p.id === draft.productId) ?? null
  const category = catalog?.categories.find((c) => c.id === menuUi.categoryId) ?? null

  const snapshot: WaiterSnapshot = {
    step: session.step,
    mode: session.mode,
    ticket: session.ticket,
    customer: {
      name: session.customer?.name ?? null,
      credit: (session.customer?.creditCents ?? 0) > 0 ? brl(session.customer!.creditCents!) : null,
      offer: session.customer?.offer
        ? `${session.customer.offer.title} (${
            session.customer.offer.method === 'percentage'
              ? `${session.customer.offer.value}% off`
              : `R$ ${session.customer.offer.value.toFixed(2)} off`
          }${
            session.customer.offer.minSubtotalCents > 0
              ? `, a partir de ${brl(session.customer.offer.minSubtotalCents)}`
              : ''
          })`
        : null,
    },
    cart: {
      count: cartCount(cart.lines),
      total: brl(cartTotalCents(cart.lines)),
      lines: cart.lines.map((line) => ({
        id: line.id,
        name: line.product.name,
        quantity: line.quantity,
        modifiers: line.modifiers.map((m) => m.name),
        total: brl(line.unitCents * line.quantity),
      })),
    },
    categoryOpen: category?.name ?? null,
    cartSheetOpen: menuUi.cartOpen,
  }

  if (product) {
    snapshot.openProduct = {
      id: product.id,
      name: product.name,
      price: brl(product.priceCents),
      quantity: draft.quantity,
      chosen: product.modifierGroups
        .map((group) => ({
          group: group.name,
          options: group.modifiers
            .filter((m) => (draft.chosen[group.id] ?? []).includes(m.id))
            .map((m) => m.name),
        }))
        .filter((entry) => entry.options.length > 0),
    }
    snapshot.blocking = draftBlocking(product, draft.chosen)
  }

  return snapshot
}
