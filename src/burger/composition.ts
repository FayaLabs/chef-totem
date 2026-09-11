import type { TotemModifier, TotemProduct } from '@/menu/types'
import type { BurgerLayer } from './pilot'
import type { BurgerAsset, BurgerBread, BurgerComposition, BurgerRecipeId } from './types'

export const BURGER_BREADS: Record<BurgerBread, string> = { brioche: 'Brioche', australian: 'Australiano', 'gluten-free': 'Sem glúten' }
// `bread` é o PÃO DA RECEITA, e não um palpite: é o pão em que a casa serve
// aquele lanche quando ninguém pede nada. Está aqui, e não escondido no valor
// padrão de `recipeLayers`, porque é ele que já vem marcado no sheet — o
// cliente que só quer o lanche do jeito da casa não deveria ter de responder
// uma pergunta cuja resposta a cozinha já sabe.
export const BURGER_RECIPES: Record<BurgerRecipeId, { name: string; ingredients: BurgerAsset[]; protein: BurgerAsset; patties: number; cheese?: BurgerAsset; bread: BurgerBread }> = {
  classic: { name: 'Max Clássico', protein: 'blend', patties: 1, cheese: 'prato', bread: 'brioche', ingredients: ['house-sauce', 'lettuce', 'tomato'] },
  'cheddar-bacon': { name: 'Cheddar Bacon', protein: 'blend', patties: 1, cheese: 'cheddar', bread: 'brioche', ingredients: ['bacon', 'onion-crispy'] },
  'smash-double': { name: 'Smash Duplo', protein: 'smash', patties: 2, cheese: 'prato', bread: 'brioche', ingredients: [] },
  chicken: { name: 'Frango Crocante', protein: 'chicken', patties: 1, bread: 'brioche', ingredients: ['lemon-mayo'] },
  veggie: { name: 'Veggie do Chef', protein: 'veggie', patties: 1, cheese: 'vegan-cheese', bread: 'brioche', ingredients: [] },
}
export const BURGER_INGREDIENTS: Partial<Record<BurgerAsset, { label: string; diameter: number; thickness: number }>> = {
  blend: { label: 'Carne', diameter: 1.02, thickness: .17 },
  smash: { label: 'Carne smash', diameter: 1.02, thickness: .08 },
  chicken: { label: 'Frango crocante', diameter: 1.02, thickness: .17 },
  veggie: { label: 'Hambúrguer vegetal', diameter: 1.02, thickness: .15 },
  cheddar: { label: 'Cheddar derretido', diameter: 1.04, thickness: .025 },
  prato: { label: 'Queijo prato', diameter: 1.04, thickness: .025 },
  'vegan-cheese': { label: 'Queijo vegetal', diameter: 1.04, thickness: .025 },
  bacon: { label: 'Bacon', diameter: 1.02, thickness: .06 },
  'onion-crispy': { label: 'Cebola crispy', diameter: .88, thickness: .065 },
  onion: { label: 'Cebola roxa', diameter: .9, thickness: .04 },
  lettuce: { label: 'Alface', diameter: 1.06, thickness: .055 },
  tomato: { label: 'Tomate', diameter: .95, thickness: .05 },
  egg: { label: 'Ovo', diameter: 1, thickness: .07 },
  'house-sauce': { label: 'Molho da casa', diameter: .86, thickness: .015 },
  'lemon-mayo': { label: 'Maionese de limão', diameter: .86, thickness: .015 },
}

/**
 * O pão da receita já marcado, no formato do rascunho (grupo → modificadores).
 *
 * Devolve `{}` quando o produto não é burger ou quando a casa não oferece
 * aquele pão: marcar sozinho uma opção que não existe no cardápio é inventar
 * pedido, e é melhor o grupo continuar pedindo escolha.
 */
export function defaultBreadChoice(product: TotemProduct): Record<string, string[]> {
  if (!product.burger) return {}
  const bread = BURGER_RECIPES[product.burger.recipe].bread
  const group = product.modifierGroups.find((g) => g.kind === 'burger-bread')
  const modifier = group?.modifiers.find((m) => m.burgerEffect?.kind === 'bread' && m.burgerEffect.bread === bread)
  return group && modifier ? { [group.id]: [modifier.id] } : {}
}

export function ingredientLayer(id: string, asset: BurgerAsset, attached = false): BurgerLayer {
  const spec = BURGER_INGREDIENTS[asset]!
  return { id, asset, ...spec, attached }
}

export function recipeLayers(recipeId: BurgerRecipeId, bread: BurgerBread = 'brioche'): BurgerLayer[] {
  const recipe = BURGER_RECIPES[recipeId]
  const layers: BurgerLayer[] = [{ id: 'bottom', asset: `${bread}-bottom`, label: `${BURGER_BREADS[bread]} · base`, diameter: 1, thickness: .12 }]
  for (let i = 0; i < recipe.patties; i++) {
    layers.push(ingredientLayer(`meat-${i}`, recipe.protein))
    if (recipe.cheese) layers.push(ingredientLayer(`cheese-${i}`, recipe.cheese, true))
  }
  recipe.ingredients.forEach((asset) => layers.push(ingredientLayer(`base-${asset}`, asset)))
  layers.push({ id: 'top', asset: `${bread}-top`, label: `${BURGER_BREADS[bread]} · topo`, diameter: 1, thickness: .28 })
  return layers
}

export function composeBurger(product: TotemProduct, modifiers: TotemModifier[]): BurgerComposition | undefined {
  if (!product.burger) return undefined
  const breadEffect = modifiers.find((modifier) => modifier.burgerEffect?.kind === 'bread')?.burgerEffect
  return { recipe: product.burger.recipe, bread: breadEffect?.kind === 'bread' ? breadEffect.bread : 'brioche', modifierIds: modifiers.map((m) => m.id) }
}

/** One resolver for preview, static composition, cart and receipt thumbnails. */
export function burgerLayers(product: TotemProduct, modifiers: TotemModifier[], includeRemoved = false): BurgerLayer[] {
  const composition = composeBurger(product, modifiers)
  if (!composition) return []
  const layers = recipeLayers(composition.recipe, composition.bread)
  const extraLayers = modifiers.flatMap((modifier) => modifier.burgerEffect?.kind === 'extra'
    ? [ingredientLayer(`extra-${modifier.id}`, modifier.burgerEffect.asset)] : [])
  // Extra cheddar stays directly on the last protein/cheese stack, below vegetables.
  const cheeseExtras = extraLayers.filter((layer) => layer.asset === 'cheddar')
  for (const layer of cheeseExtras) layer.attached = true
  const lastMeat = layers.reduce((last, layer, index) => layer.id.startsWith('meat-') || layer.id.startsWith('cheese-') ? index : last, 0)
  layers.splice(lastMeat + 1, 0, ...cheeseExtras)
  layers.splice(layers.length - 1, 0, ...extraLayers.filter((layer) => layer.asset !== 'cheddar'))
  const removed = new Set(modifiers.flatMap((m) => m.burgerEffect?.kind === 'remove' ? [m.burgerEffect.layerId] : []))
  return includeRemoved ? layers : layers.filter((layer) => !removed.has(layer.id))
}

/** No price discount for an omitted included ingredient. These are explicit
 * demo-catalog options, not synthetic cart-only modifiers. Bread/protein remain
 * recipe choices; removing them would create an unpriced new kind of product. */
export function burgerRemovalOptions(productId: string, recipe: BurgerRecipeId): TotemModifier[] {
  return recipeLayers(recipe).filter((layer) => !['top', 'bottom'].includes(layer.id) && !layer.id.startsWith('meat-')).map((layer) => ({
    id: layer.asset === 'onion-crispy' ? 'mb-m-sem-cebola' : `${productId}-without-${layer.id}`,
    name: `Sem ${layer.label.toLocaleLowerCase('pt-BR')}${recipe === 'smash-double' && layer.id.startsWith('cheese-') ? ` (${layer.id === 'cheese-0' ? '1º' : '2º'} disco)` : ''}`,
    surchargeCents: 0,
    burgerEffect: { kind: 'remove', layerId: layer.id },
  }))
}
