import type { CatalogProvider, TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// A menu for development, CI and screenshots — NOT a fallback.
//
// It is reached only by setting VITE_TOTEM_CATALOG=demo. If the live provider
// fails, the panel shows an error; it never quietly serves this instead. A
// kiosk that invents a menu when its backend is down takes orders the kitchen
// will never see.
//
// It exists because the QA tenant's catalog is test debris ("QA Prato
// 1784605022523", no categories, no images, ingredients priced at zero), and a
// screenshot of that proves nothing about the design.
// ---------------------------------------------------------------------------

const SIZE = {
  id: 'g-size',
  name: 'Tamanho',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: 'm-broto', name: 'Broto', surchargeCents: 0 },
    { id: 'm-media', name: 'Média', surchargeCents: 800 },
    { id: 'm-grande', name: 'Grande', surchargeCents: 1600 },
  ],
}

const EXTRAS = {
  id: 'g-extras',
  name: 'Adicionais',
  required: false,
  minSelections: 0,
  maxSelections: 4,
  modifiers: [
    { id: 'm-borda', name: 'Borda recheada', surchargeCents: 900 },
    { id: 'm-bacon', name: 'Bacon extra', surchargeCents: 700 },
    { id: 'm-catupiry', name: 'Catupiry', surchargeCents: 600 },
    { id: 'm-sem-cebola', name: 'Sem cebola', surchargeCents: 0 },
  ],
}

const CATEGORIES = [
  { id: 'c-pizzas', name: 'Pizzas', sortOrder: 1 },
  { id: 'c-massas', name: 'Massas', sortOrder: 2 },
  { id: 'c-entradas', name: 'Entradas', sortOrder: 3 },
  { id: 'c-bebidas', name: 'Bebidas', sortOrder: 4 },
  { id: 'c-sobremesas', name: 'Sobremesas', sortOrder: 5 },
]

const PRODUCTS = [
  ['p-calabresa', 'c-pizzas', 'Calabresa', 'Calabresa fatiada na hora, cebola roxa e orégano.', 5900, 6900, true, false],
  ['p-margherita', 'c-pizzas', 'Margherita', 'Tomate, muçarela de búfala e manjericão fresco.', 5500, null, false, false],
  ['p-portuguesa', 'c-pizzas', 'Portuguesa', 'Presunto, ovo, cebola, azeitona e ervilha.', 6200, null, false, false],
  ['p-quatro-queijos', 'c-pizzas', 'Quatro queijos', 'Muçarela, provolone, gorgonzola e parmesão.', 6400, 7200, false, false],
  ['p-carbonara', 'c-massas', 'Carbonara', 'Guanciale, gema, pecorino e pimenta-do-reino.', 5200, null, false, false],
  ['p-bolonhesa', 'c-massas', 'Bolonhesa', 'Ragu de costela cozido por seis horas.', 4900, null, false, false],
  ['p-cacio', 'c-massas', 'Cacio e pepe', 'Pecorino romano e pimenta. Só isso, e é o suficiente.', 4600, null, false, true],
  ['p-bruschetta', 'c-entradas', 'Bruschetta', 'Pão de fermentação natural, tomate e alho.', 2400, null, false, false],
  ['p-polenta', 'c-entradas', 'Polenta frita', 'Com parmesão e alecrim.', 2200, 2800, false, false],
  ['p-coca', 'c-bebidas', 'Coca-Cola 350ml', undefined, 800, null, false, false],
  ['p-suco', 'c-bebidas', 'Suco de laranja', 'Espremido na hora.', 1200, null, false, false],
  ['p-agua', 'c-bebidas', 'Água com gás', undefined, 600, null, false, false],
  ['p-tiramisu', 'c-sobremesas', 'Tiramisù', 'Mascarpone, café e cacau.', 2600, null, false, false],
  ['p-pudim', 'c-sobremesas', 'Pudim de leite', undefined, 1800, null, false, false],
] as const

export function createDemoCatalog(): CatalogProvider {
  return {
    async load(): Promise<TotemCatalog> {
      return {
        categories: CATEGORIES,
        products: PRODUCTS.map(([id, categoryId, name, description, price, compareAt, featured, soldOut]) => ({
          id,
          categoryId,
          name,
          description: description ?? undefined,
          priceCents: price,
          compareAtCents: compareAt ?? undefined,
          featured,
          soldOut,
          imageUrl: undefined,
          modifierGroups: categoryId === 'c-pizzas' ? [SIZE, EXTRAS] : categoryId === 'c-massas' ? [EXTRAS] : [],
        })),
      }
    },
  }
}
