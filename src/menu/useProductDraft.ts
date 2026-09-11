import { create } from 'zustand'
import type { TotemModifier, TotemProduct } from '@/menu/types'
import { lineUnitCents, useCart, type CartLine } from '@/cart/useCart'

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
  pizzaMode: 'whole' | 'half'
  pizzaFirstChosen: boolean
  burgerRecipeChosen: boolean
  activeHalf: 0 | 1
  editingLineId: string | null

  open: (productId: string, assemblePizza?: boolean, blankFirst?: boolean, blankBurger?: boolean) => void
  close: () => void
  edit: (line: CartLine) => void
  setPizzaMode: (mode: 'whole' | 'half') => void
  choosePizza: (product: TotemProduct, slot: 0 | 1) => void
  chooseBurger: (product: TotemProduct) => void
  setActiveHalf: (half: 0 | 1) => void
  setQuantity: (quantity: number) => void
  /** Honours the group's max: 1 behaves as a radio, N as a capped checkbox. */
  toggle: (groupId: string, modifierId: string, max: number) => void
}

export const useProductDraft = create<ProductDraftState>((set, get) => ({
  productId: null,
  quantity: 1,
  chosen: {},
  pizzaMode: 'whole',
  pizzaFirstChosen: false,
  burgerRecipeChosen: true,
  activeHalf: 0,
  editingLineId: null,

  // Opening always starts clean — this replaces the effect that reset on
  // `product?.id` change, and makes "open then immediately tick" atomic for a
  // tool call.
  open: (productId, assemblePizza = false, blankFirst = false, blankBurger = false) => set({ productId, quantity: 1, chosen: {}, pizzaMode: assemblePizza ? 'half' : 'whole', pizzaFirstChosen: !blankFirst, burgerRecipeChosen: !blankBurger, activeHalf: 0, editingLineId: null }),
  close: () => set({ productId: null, quantity: 1, chosen: {}, pizzaMode: 'whole', pizzaFirstChosen: false, burgerRecipeChosen: true, activeHalf: 0, editingLineId: null }),
  edit: (line) => set({
    productId: line.product.id,
    quantity: line.quantity,
    chosen: Object.fromEntries(line.product.modifierGroups.map((group) => [group.id,
      line.modifiers.filter((m) => group.modifiers.some((option) => option.id === m.id)).map((m) => m.id),
    ])),
    pizzaMode: line.pizza?.mode ?? 'whole', pizzaFirstChosen: true, burgerRecipeChosen: true, activeHalf: 0, editingLineId: line.id,
  }),
  setPizzaMode: (pizzaMode) => set({ pizzaMode, activeHalf: pizzaMode === 'half' && get().pizzaFirstChosen ? 1 : 0 }),
  setActiveHalf: (activeHalf) => set({ activeHalf }),
  chooseBurger: (product) => {
    if (!product.burger || product.soldOut) return
    const chosen = Object.fromEntries(product.modifierGroups.map((group) => [group.id,
      (get().chosen[group.id] ?? []).filter((id) => group.modifiers.some((m) => m.id === id)),
    ]))
    set({ productId: product.id, chosen, burgerRecipeChosen: true })
  },
  choosePizza: (product, slot) => {
    if (!product.pizza || product.soldOut) return
    const current = get()
    const halfGroup = product.modifierGroups.find((group) => group.kind === 'pizza-half')
    if (slot === 1 && current.productId && halfGroup) {
      const half = halfGroup.modifiers.find((modifier) => modifier.pizzaFlavor?.productId === product.id)
      if (!half) return
      set({ chosen: { ...current.chosen, [halfGroup.id]: [half.id] }, pizzaMode: 'half', activeHalf: current.pizzaFirstChosen ? 1 : 0 })
      return
    }
    // Preserve only options that exist on the new base. Picking the first
    // flavor hands the customer straight to the other half, without another tap.
    const chosen = Object.fromEntries(product.modifierGroups.map((group) => [group.id,
      (current.chosen[group.id] ?? []).filter((id) => group.modifiers.some((m) => m.id === id)),
    ]))
    set({ productId: product.id, chosen, pizzaFirstChosen: true, activeHalf: current.pizzaMode === 'half' ? 1 : 0 })
  },
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
  pizzaMode: 'whole' | 'half' = 'whole',
  pizzaFirstChosen = true,
  burgerRecipeChosen = true,
): DraftBlocking | undefined {
  if (product.burger && !burgerRecipeChosen) return { groupId: 'burger-recipe', groupName: 'seu burger', options: [] }
  if (product.pizza && !pizzaFirstChosen) {
    return { groupId: 'pizza-first', groupName: 'primeiro sabor', options: product.modifierGroups
      .flatMap((g) => g.modifiers.flatMap((m) => m.pizzaFlavor ? [m.pizzaFlavor.name] : [])) }
  }
  if (product.pizza && pizzaMode === 'half') {
    const halves = product.modifierGroups.find((group) => group.kind === 'pizza-half')
    if (halves && !halves.modifiers.some((m) => (chosen[halves.id] ?? []).includes(m.id))) {
      return { groupId: halves.id, groupName: 'segundo sabor', options: halves.modifiers.map((m) => m.name) }
    }
  }
  const group = product.modifierGroups.find(
    (g) => g.required && (chosen[g.id] ?? []).length < Math.max(1, g.minSelections),
  )
  return group
    ? { groupId: group.id, groupName: group.name, options: group.modifiers.map((m) => m.name) }
    : undefined
}

/**
 * What to ask about NEXT — which is not the same question as what blocks.
 *
 * `draftBlocking` answers "why can this not go in the cart", so it only ever
 * looks at required groups; widening it would stop anyone from adding an item
 * with an untouched optional group.
 *
 * This answers "what does the screen show that is still empty", in the order the
 * screen shows it. The two diverge exactly where the waiter used to: on a burger
 * whose bread is optional and whose doneness is required, the panel drew bread
 * first and the assistant was handed doneness, so each followed a different rule
 * about the same list and the customer heard the questions inverted.
 */
export function draftNextQuestion(
  product: TotemProduct,
  chosen: Record<string, string[]>,
): (DraftBlocking & { required: boolean }) | undefined {
  const group = product.modifierGroups.find(
    (g) => (chosen[g.id] ?? []).length < Math.max(g.required ? 1 : 0, g.minSelections),
  )
  return group
    ? {
        groupId: group.id,
        groupName: group.name,
        options: group.modifiers.map((m) => m.name),
        required: group.required,
      }
    : undefined
}

/** Commit once from the current draft. Animation callbacks never change the cart. */
export function commitProductDraft(product: TotemProduct): boolean {
  const draft = useProductDraft.getState()
  if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 99) return false
  if (draft.productId !== product.id || product.soldOut || draftBlocking(product, draft.chosen, draft.pizzaMode, draft.pizzaFirstChosen, draft.burgerRecipeChosen)) return false
  useCart.getState().add(product, draft.quantity, draftModifiers(product, draft.chosen), draft.editingLineId)
  draft.close()
  return true
}

/** Unit price with the chosen modifiers, in cents. */
export function draftUnitCents(product: TotemProduct, chosen: Record<string, string[]>): number {
  return lineUnitCents(product, draftModifiers(product, chosen))
}
