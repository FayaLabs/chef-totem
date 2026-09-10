import { beforeEach, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { DEMO_TENANTS } from '@/demo/tenants'
import { burgerLayers, composeBurger } from '@/burger/composition'
import { burgerPoses } from '@/burger/pilot'
import { commitProductDraft, draftBlocking, draftModifiers, draftUnitCents, useProductDraft } from '@/menu/useProductDraft'
import { cartTotalCents, useCart } from '@/cart/useCart'
import dimensions from '../public/demo/maxburger/burger/assets.json'
import { cartLineToOrderLine } from '@/orders/place-order'

const burgers = DEMO_TENANTS.maxburger.catalog.products.filter((p) => p.burger)
const classic = burgers.find((p) => p.id === 'mb-p-classico')!
const cheddar = burgers.find((p) => p.id === 'mb-p-cheddar-bacon')!
const choose = (id: string) => {
  const product = burgers.find((p) => p.id === useProductDraft.getState().productId)!
  const group = product.modifierGroups.find((g) => g.modifiers.some((m) => m.id === id))!
  useProductDraft.getState().toggle(group.id, id, group.maxSelections)
}
beforeEach(() => { useProductDraft.getState().close(); useCart.getState().clear() })

test('21 recortes locais cobrem todas as receitas, pães e combinações de extras', () => {
  expect(Object.keys(dimensions)).toHaveLength(21)
  for (const asset of Object.keys(dimensions)) expect(existsSync(`public/demo/maxburger/burger/${asset}.webp`)).toBe(true)
  for (const product of burgers) {
    const breads = product.modifierGroups.find((g) => g.kind === 'burger-bread')!.modifiers
    const extras = product.modifierGroups.find((g) => g.kind === 'burger-extras')!.modifiers
    for (const bread of breads) for (let mask = 0; mask < 8; mask++) {
      const modifiers = [bread, ...extras.filter((_, i) => mask & (1 << i))]
      const layers = burgerLayers(product, modifiers)
      expect(new Set(layers.map((l) => l.id)).size).toBe(layers.length)
      expect(layers[0].asset.replace('-bottom', '')).toBe(layers.at(-1)!.asset.replace('-top', ''))
      for (const open of [true, false]) {
        const poses = burgerPoses(layers, dimensions, open)
        poses.forEach((pose, i) => {
          const size = dimensions[layers[i].asset]
          expect(size).toBeDefined()
          const halfHeight = pose.width * size.height / size.width / 2
          expect(pose.centerY - halfHeight).toBeGreaterThanOrEqual(6.99)
          expect(pose.centerY + halfHeight).toBeLessThanOrEqual(93.01)
          if (layers[i].attached) expect(pose.group).toBe(poses[i - 1].group)
        })
      }
    }
  }
})

test('intro exige escolha explícita da receita, pão e ponto; não pré-compra o clássico', () => {
  const draft = useProductDraft.getState()
  draft.open(classic.id, false, false, true)
  choose('mb-m-australiano'); choose('mb-m-bem-passado')
  expect(commitProductDraft(classic)).toBe(false)
  expect(draftBlocking(classic, useProductDraft.getState().chosen, 'whole', true, false)?.groupId).toBe('burger-recipe')
  draft.chooseBurger(classic)
  expect(commitProductDraft(classic)).toBe(true)
  expect(useCart.getState().lines[0].burger?.bread).toBe('australian')
})

test('trocar receita preserva escolhas válidas e não leva retiradas de outra receita', () => {
  const draft = useProductDraft.getState()
  draft.open(cheddar.id)
  choose('mb-m-sem-gluten'); choose('mb-m-bem-passado'); choose('mb-m-sem-cebola'); choose('mb-m-ovo')
  draft.setQuantity(2)
  draft.chooseBurger(burgers.find((p) => p.id === 'mb-p-frango')!)
  const state = useProductDraft.getState()
  expect(state.quantity).toBe(2)
  expect(Object.values(state.chosen).flat()).toEqual(expect.arrayContaining(['mb-m-sem-gluten', 'mb-m-ovo']))
  expect(Object.values(state.chosen).flat()).not.toContain('mb-m-sem-cebola')
  expect(Object.values(state.chosen).flat()).not.toContain('mb-m-bem-passado')
})

test('extra retirado deixa de cobrar e de aparecer; sem ingrediente incluído não dá desconto', () => {
  useProductDraft.getState().open(cheddar.id)
  choose('mb-m-australiano'); choose('mb-m-ponto'); choose('mb-m-bacon'); choose('mb-m-cheddar'); choose('mb-m-sem-cebola')
  const chosen = () => useProductDraft.getState().chosen
  expect(draftUnitCents(cheddar, chosen())).toBe(4900)
  const layers = burgerLayers(cheddar, draftModifiers(cheddar, chosen()))
  expect(layers.filter((l) => l.asset === 'bacon')).toHaveLength(2)
  expect(layers.some((l) => l.asset === 'onion-crispy')).toBe(false)
  choose('mb-m-bacon')
  expect(draftUnitCents(cheddar, chosen())).toBe(4300)
  expect(burgerLayers(cheddar, draftModifiers(cheddar, chosen())).filter((l) => l.asset === 'bacon')).toHaveLength(1)
})

test('queijo extra não some ao retirar o queijo incluído', () => {
  const extra = classic.modifierGroups.flatMap((g) => g.modifiers).find((m) => m.id === 'mb-m-cheddar')!
  const without = classic.modifierGroups.flatMap((g) => g.modifiers).find((m) => m.burgerEffect?.kind === 'remove' && m.burgerEffect.layerId === 'cheese-0')!
  const layers = burgerLayers(classic, [extra, without])
  expect(layers.some((l) => l.asset === 'prato')).toBe(false)
  expect(layers.filter((l) => l.asset === 'cheddar')).toHaveLength(1)
  const poses = burgerPoses(layers, dimensions, true)
  expect(poses.find((p) => p.id === 'extra-mb-m-cheddar')!.group).toBe(poses.find((p) => p.id === 'meat-0')!.group)
})

test('reedição preserva quantidade e substitui a linha sem duplicar; cancelamento é inofensivo', () => {
  const draft = useProductDraft.getState()
  draft.open(cheddar.id)
  choose('mb-m-australiano'); choose('mb-m-ponto'); choose('mb-m-sem-cebola')
  draft.setQuantity(2)
  expect(commitProductDraft(cheddar)).toBe(true)
  const original = useCart.getState().lines[0]
  expect(original.modifiers.map((m) => m.name)).toContain('Sem cebola crispy')
  expect(original.burger).toEqual(composeBurger(cheddar, original.modifiers))
  draft.edit(original); choose('mb-m-ovo'); draft.close()
  expect(useCart.getState().lines).toEqual([original])
  draft.edit(original); choose('mb-m-ovo')
  expect(commitProductDraft(cheddar)).toBe(true)
  expect(useCart.getState().lines).toHaveLength(1)
  expect(cartTotalCents(useCart.getState().lines)).toBe(8400)
  expect(useCart.getState().lastAdded?.burgerLayers?.some((l) => l.asset === 'egg')).toBe(true)
})

test('receita veggie continua esgotada e não entra no pedido nem por API', () => {
  const veggie = burgers.find((p) => p.burger?.recipe === 'veggie')!
  expect(veggie.soldOut).toBe(true)
  useProductDraft.getState().open(classic.id)
  useProductDraft.getState().chooseBurger(veggie)
  expect(useProductDraft.getState().productId).toBe(classic.id)
  useCart.getState().add(veggie, 1, [])
  expect(useCart.getState().lines).toHaveLength(0)
})

test('a linha enviada à cozinha inclui ponto, pão, retiradas e composição estruturada', () => {
  useProductDraft.getState().open(cheddar.id)
  choose('mb-m-sem-gluten'); choose('mb-m-bem-passado'); choose('mb-m-sem-cebola'); choose('mb-m-ovo')
  expect(commitProductDraft(cheddar)).toBe(true)
  const cartLine = useCart.getState().lines[0]
  const orderLine = cartLineToOrderLine(cartLine)
  expect(orderLine.description).toContain('Bem passado')
  expect(orderLine.description).toContain('Sem glúten')
  expect(orderLine.description).toContain('Sem cebola crispy')
  expect(orderLine.description).toContain('Ovo')
  expect(orderLine.unitPriceCents).toBe(4400)
  expect(orderLine.metadata?.burger).toEqual(cartLine.burger)
})
