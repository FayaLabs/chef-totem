import { create } from 'zustand'

// ---------------------------------------------------------------------------
// What the menu screen is currently showing.
//
// This used to be four `useState` calls inside MenuScreen. It moved out for one
// reason: the assistant has to be able to SHOW its work. It could already add a
// line to the cart from outside React — but a waiter that fills your order
// while the screen sits still is indistinguishable from a broken panel.
//
// Now "abre as bebidas" and "essa aqui, a costela" move the actual screen.
// ---------------------------------------------------------------------------

export type MenuFilter = 'all' | 'promo' | 'featured'

interface MenuUiState {
  categoryId: string | null
  filter: MenuFilter
  cartOpen: boolean

  openCategory: (categoryId: string | null) => void
  setFilter: (filter: MenuFilter) => void
  setCartOpen: (open: boolean) => void
  /** Back to a pristine menu — called when a visit ends. */
  reset: () => void
}

export const useMenuUi = create<MenuUiState>((set) => ({
  categoryId: null,
  filter: 'all',
  cartOpen: false,

  openCategory: (categoryId) => set({ categoryId }),
  setFilter: (filter) => set({ filter }),
  setCartOpen: (cartOpen) => set({ cartOpen }),
  reset: () => set({ categoryId: null, filter: 'all', cartOpen: false }),
}))
