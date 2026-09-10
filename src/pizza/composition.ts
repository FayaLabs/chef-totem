import type { TotemModifier, TotemProduct } from '@/menu/types'
import type { PizzaComposition } from './types'

export function composePizza(product: TotemProduct, modifiers: TotemModifier[]): PizzaComposition | undefined {
  if (!product.pizza) return undefined
  const second = modifiers.find((modifier) => modifier.pizzaFlavor)?.pizzaFlavor
  return {
    mode: second ? 'half' : 'whole',
    first: { productId: product.id, name: product.name, imageUrl: product.pizza.imageUrl },
    ...(second ? { second } : {}),
    pricingPolicy: 'catalog-modifiers-v1',
  }
}

export function pizzaName(pizza: PizzaComposition): string {
  return pizza.second ? `½ ${pizza.first.name} + ½ ${pizza.second.name}` : pizza.first.name
}

export function angularDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

export const PIZZA_ASSETS = '/demo/pizza-house/pizza'

/** Medium fills the board; small shrinks only the food, large zooms the ensemble. */
export function pizzaPreviewScale(diameterCm = 30): { food: number; scene: number } {
  const ratio = Math.max(.5, Math.min(1.4, diameterCm / 30))
  return { food: Math.min(1, ratio), scene: 1 + Math.max(0, ratio - 1) * 1.8 }
}
