// The shape the totem screens consume. Deliberately NOT the database shape:
// the panel should not care that a category is `categories WHERE kind =
// 'menu_category'`, nor that "sold out" lives in menu_items.status.

import type { PizzaFlavor } from '@/pizza/types'
import type { BurgerModifierEffect, BurgerRecipeId } from '@/burger/types'

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
  /** Structured second flavor, shared by the builder, waiter and kitchen. */
  pizzaFlavor?: PizzaFlavor
  /** Physical pizza diameter; drives the preview without parsing display text. */
  pizzaDiameterCm?: number
  burgerEffect?: BurgerModifierEffect
}

export interface TotemModifierGroup {
  kind?: 'pizza-size' | 'pizza-half' | 'pizza-extras' | 'burger-bread' | 'burger-point' | 'burger-extras' | 'burger-combo' | 'burger-removals'
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
  /** Enables the interactive pizza experience with a compositable cutout. */
  pizza?: { imageUrl: string; defaultForAssembly?: boolean }
  burger?: { recipe: BurgerRecipeId; defaultForAssembly?: boolean }
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
