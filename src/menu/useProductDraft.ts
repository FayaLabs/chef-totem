import { create } from 'zustand'
import type { TotemModifier, TotemProduct } from '@/menu/types'
import { lineUnitCents } from '@/cart/useCart'

// ---------------------------------------------------------------------------
// The item being customised, before it becomes a cart line.
//
// Lifted out of ProductSheet so the assistant can tick options on the
// customer's behalf and have them light up on screen. `blocking` is the same
// rule the button already enforced — now computed in one place, so the sheet
// and the assistant can never disagree about whether an item is ready.
// ---------------------------------------------------------------------------

export interface DraftBlocking {
  groupId: string
  groupName: string
  options: string[]
}

interface ProductDraftState {
  /** The id, not the object: a tool call names a product, it does not carry one. */
  productId: string | null
  quantity: number
  /** groupId → chosen modifier ids. */
  chosen: Record<string, string[]>

  open: (productId: string) => void
  close: () => void
  setQuantity: (quantity: number) => void
  /** Honours the group's max: 1 behaves as a radio, N as a capped checkbox. */
  toggle: (groupId: string, modifierId: string, max: number) => void
}

export const useProductDraft = create<ProductDraftState>((set, get) => ({
  productId: null,
  quantity: 1,
  chosen: {},

  // Opening always starts clean — this replaces the effect that reset on
  // `product?.id` change, and makes "open then immediately tick" atomic for a
  // tool call.
  open: (productId) => set({ productId, quantity: 1, chosen: {} }),
  close: () => set({ productId: null, quantity: 1, chosen: {} }),
  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.min(99, quantity)) }),

  toggle: (groupId, modifierId, max) => {
    const list = get().chosen[groupId] ?? []
    if (list.includes(modifierId)) {
      set({ chosen: { ...get().chosen, [groupId]: list.filter((id) => id !== modifierId) } })
      return
    }
    if (max === 1) {
      set({ chosen: { ...get().chosen, [groupId]: [modifierId] } })
      return
    }
    // Over the cap is ignored rather than rotated: silently dropping the
    // customer's oldest choice is worse than doing nothing.
    if (list.length >= max) return
    set({ chosen: { ...get().chosen, [groupId]: [...list, modifierId] } })
  },
}))

/** The modifier objects behind the chosen ids, in group order. */
export function draftModifiers(product: TotemProduct, chosen: Record<string, string[]>): TotemModifier[] {
  return product.modifierGroups.flatMap((group) =>
    group.modifiers.filter((modifier) => (chosen[group.id] ?? []).includes(modifier.id)),
  )
}

/** The first required group that is not satisfied, or undefined when ready. */
export function draftBlocking(
  product: TotemProduct,
  chosen: Record<string, string[]>,
): DraftBlocking | undefined {
  const group = product.modifierGroups.find(
    (g) => g.required && (chosen[g.id] ?? []).length < Math.max(1, g.minSelections),
  )
  return group
    ? { groupId: group.id, groupName: group.name, options: group.modifiers.map((m) => m.name) }
    : undefined
}

/** Unit price with the chosen modifiers, in cents. */
export function draftUnitCents(product: TotemProduct, chosen: Record<string, string[]>): number {
  return lineUnitCents(product, draftModifiers(product, chosen))
}
