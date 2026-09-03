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
  /**
   * O prato para o qual o garçom está APONTANDO enquanto fala dele.
   *
   * Recomendar sem apontar é o problema clássico do assistente de voz: ele diz
   * "o mac and cheese é o mais pedido" e o cliente fica procurando na grade
   * qual dos doze é esse. O nome falado não vira posição na tela sozinho.
   *
   * É um estado de ATENÇÃO, não de seleção: some sozinho, e some no primeiro
   * toque em qualquer coisa. Um destaque que gruda vira uma seleção que o
   * cliente não fez.
   */
  highlightId: string | null

  openCategory: (categoryId: string | null) => void
  setFilter: (filter: MenuFilter) => void
  setCartOpen: (open: boolean) => void
  highlight: (productId: string | null) => void
  /** Back to a pristine menu — called when a visit ends. */
  reset: () => void
}

export const useMenuUi = create<MenuUiState>((set) => ({
  categoryId: null,
  filter: 'all',
  cartOpen: false,
  highlightId: null,

  // Toda ação do cliente apaga o destaque. Ele é do garçom, e a tela é do
  // cliente: no instante em que a pessoa mexe, o dedo dela ganha.
  openCategory: (categoryId) => set({ categoryId, highlightId: null }),
  setFilter: (filter) => set({ filter, highlightId: null }),
  setCartOpen: (cartOpen) => set({ cartOpen, highlightId: null }),
  highlight: (highlightId) => set({ highlightId }),
  reset: () => set({ categoryId: null, filter: 'all', cartOpen: false, highlightId: null }),
}))
