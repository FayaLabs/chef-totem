export type BurgerBread = 'brioche' | 'australian' | 'gluten-free'
export type BurgerRecipeId = 'classic' | 'cheddar-bacon' | 'smash-double' | 'chicken' | 'veggie'
export type BurgerAsset = 'brioche-top' | 'brioche-bottom' | 'australian-top' | 'australian-bottom'
  | 'gluten-free-top' | 'gluten-free-bottom' | 'blend' | 'smash' | 'chicken' | 'veggie'
  | 'cheddar' | 'prato' | 'vegan-cheese' | 'lettuce' | 'tomato' | 'onion' | 'onion-crispy'
  | 'bacon' | 'egg' | 'house-sauce' | 'lemon-mayo'
export type BurgerModifierEffect = { kind: 'bread'; bread: BurgerBread }
  | { kind: 'extra'; asset: 'bacon' | 'cheddar' | 'egg' }
  | { kind: 'remove'; layerId: string }

export interface BurgerComposition {
  recipe: BurgerRecipeId
  bread: BurgerBread
  /** Explicit modifier ids preserve prices, removals and the exact kitchen instruction. */
  modifierIds: string[]
}
