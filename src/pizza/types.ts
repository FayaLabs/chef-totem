export interface PizzaFlavor {
  productId: string
  name: string
  imageUrl: string
}

export interface PizzaComposition {
  mode: 'whole' | 'half'
  first: PizzaFlavor
  second?: PizzaFlavor
  /** Retains the tenant's existing base-price + modifier policy. */
  pricingPolicy: 'catalog-modifiers-v1'
}
