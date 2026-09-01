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

interface CartState {
  lines: CartLine[]
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

  add: (product, quantity, modifiers) => {
    const signature = signatureOf(product, modifiers)
    const existing = get().lines.find((line) => line.id === signature)
    if (existing) {
      set({
        lines: get().lines.map((line) =>
          line.id === signature ? { ...line, quantity: line.quantity + quantity } : line,
        ),
      })
      return
    }
    set({
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

  clear: () => set({ lines: [] }),
}))

export const cartCount = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0)

export const cartTotalCents = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)

export const brl = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
