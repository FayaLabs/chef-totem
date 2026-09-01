// The shape the totem screens consume. Deliberately NOT the database shape:
// the panel should not care that a category is `categories WHERE kind =
// 'menu_category'`, nor that "sold out" lives in menu_items.status.

export interface TotemCategory {
  id: string
  name: string
  icon?: string
  sortOrder: number
}

export interface TotemModifier {
  id: string
  name: string
  /** Cents. Positive adds to the line. */
  surchargeCents: number
}

export interface TotemModifierGroup {
  id: string
  name: string
  required: boolean
  minSelections: number
  maxSelections: number
  modifiers: TotemModifier[]
}

export interface TotemProduct {
  id: string
  name: string
  description?: string
  priceCents: number
  /** Was-price for a strikethrough. Undefined = not on promotion. */
  compareAtCents?: number
  imageUrl?: string
  /** Short looping clip shown on the featured card. */
  videoUrl?: string
  categoryId?: string
  soldOut: boolean
  featured: boolean
  modifierGroups: TotemModifierGroup[]
}

export interface TotemCatalog {
  categories: TotemCategory[]
  products: TotemProduct[]
}

export interface CatalogProvider {
  load(): Promise<TotemCatalog>
}
