import { create } from 'zustand'
import type { TotemModifier, TotemProduct } from '@/menu/types'

// ---------------------------------------------------------------------------
// The order being built.
//
// A LINE is a product plus the exact set of modifiers chosen for it. Two lines
// of the same dish with different modifiers must never merge: "one with bacon,
// one without" is two things the kitchen has to make differently, and folding
// them into "2x" is how a customer gets the wrong plate.
// ---------------------------------------------------------------------------

export interface CartLine {
  /** Stable per line, not per product — see the merge rule above. */
  id: string
  product: TotemProduct
  quantity: number
  modifiers: TotemModifier[]
  /** Unit price including modifiers, in cents. */
  unitCents: number
}

/**
 * O último item que entrou, para a barra poder mostrá-lo entrando.
 *
 * Mora no carrinho e não numa tela porque quem adiciona nem sempre é a tela: o
 * garçom adiciona por conta própria, e o cliente precisa ver a mesma
 * confirmação quer tenha tocado, quer tenha falado.
 */
export interface CartFlash {
  name: string
  imageUrl?: string
  /** Muda a cada adição, mesmo repetindo o prato — é o que reinicia a animação. */
  seq: number
}

interface CartState {
  lines: CartLine[]
  lastAdded: CartFlash | null
  add: (product: TotemProduct, quantity: number, modifiers: TotemModifier[]) => void
  setQuantity: (lineId: string, quantity: number) => void
  remove: (lineId: string) => void
  clear: () => void
}

export function lineUnitCents(product: TotemProduct, modifiers: TotemModifier[]): number {
  return product.priceCents + modifiers.reduce((sum, m) => sum + m.surchargeCents, 0)
}

/** Identity of a line: the dish AND what was done to it. */
function signatureOf(product: TotemProduct, modifiers: TotemModifier[]): string {
  return [product.id, ...modifiers.map((m) => m.id).sort()].join('|')
}

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  lastAdded: null,

  add: (product, quantity, modifiers) => {
    const signature = signatureOf(product, modifiers)
    const flash: CartFlash = {
      name: product.name,
      imageUrl: product.imageUrl,
      seq: (get().lastAdded?.seq ?? 0) + 1,
    }
    const existing = get().lines.find((line) => line.id === signature)
    if (existing) {
      set({
        lastAdded: flash,
        lines: get().lines.map((line) =>
          line.id === signature ? { ...line, quantity: line.quantity + quantity } : line,
        ),
      })
      return
    }
    set({
      lastAdded: flash,
      lines: [
        ...get().lines,
        { id: signature, product, quantity, modifiers, unitCents: lineUnitCents(product, modifiers) },
      ],
    })
  },

  setQuantity: (lineId, quantity) =>
    set({
      lines:
        quantity <= 0
          ? get().lines.filter((line) => line.id !== lineId)
          : get().lines.map((line) => (line.id === lineId ? { ...line, quantity } : line)),
    }),

  remove: (lineId) => set({ lines: get().lines.filter((line) => line.id !== lineId) }),

  clear: () => set({ lines: [], lastAdded: null }),
}))

export const cartCount = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0)

export const cartTotalCents = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)

export const brl = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
