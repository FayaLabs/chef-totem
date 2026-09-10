import { beforeEach, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { PIZZA_HOUSE } from '@/demo/tenants'
import { useProductDraft, draftBlocking, draftModifiers, draftUnitCents, commitProductDraft } from '@/menu/useProductDraft'
import { useCart } from '@/cart/useCart'
import { angularDelta, composePizza, pizzaName, pizzaPreviewScale } from '@/pizza/composition'
import { pinchPizzaZoom } from '@/pizza/zoom'
import { executeWaiterTool } from '@/waiter/tools'
import { buildSnapshot } from '@/waiter/snapshot'

const product = (id: string) => PIZZA_HOUSE.catalog.products.find((p) => p.id === `ph-p-${id}`)!
const size = () => useProductDraft.getState().toggle('ph-g-tamanho', 'ph-m-media', 1)
beforeEach(() => { useProductDraft.getState().close(); useCart.getState().clear() })

test('entrada automática não inventa primeira metade e bloqueia até o cliente escolher', () => {
  const p = product('calabresa')
  useProductDraft.getState().open(p.id, true, true)
  size()
  expect(useProductDraft.getState().pizzaFirstChosen).toBe(false)
  expect(buildSnapshot(PIZZA_HOUSE.catalog).openProduct?.pizza?.first).toBeNull()
  expect(buildSnapshot(PIZZA_HOUSE.catalog).blocking?.groupName).toBe('primeiro sabor')
  useProductDraft.getState().choosePizza(product('quatro-queijos'), 1)
  expect(commitProductDraft(p)).toBe(false)
  expect(useProductDraft.getState().activeHalf).toBe(0)
  useProductDraft.getState().choosePizza(p, 0)
  expect(useProductDraft.getState().pizzaFirstChosen).toBe(true)
  expect(commitProductDraft(p)).toBe(true)
})

test('abrir uma pizza por toque já entra na montagem da primeira metade', () => {
  useProductDraft.getState().open(product('calabresa').id, true)
  expect(useProductDraft.getState()).toMatchObject({ pizzaMode: 'half', activeHalf: 0, quantity: 1, chosen: {} })
})

test('escolher o primeiro sabor avança; escolher o segundo preserva o primeiro', () => {
  useProductDraft.getState().open(product('calabresa').id, true)
  useProductDraft.getState().choosePizza(product('quatro-queijos'), 0)
  expect(useProductDraft.getState()).toMatchObject({ productId: 'ph-p-quatro-queijos', activeHalf: 1 })
  useProductDraft.getState().choosePizza(product('calabresa'), 1)
  const draft = useProductDraft.getState()
  const pizza = composePizza(product('quatro-queijos'), draftModifiers(product('quatro-queijos'), draft.chosen))!
  expect(pizzaName(pizza)).toBe('½ Quatro queijos + ½ Calabresa')
  expect(draftUnitCents(product('quatro-queijos'), draft.chosen)).toBe(7000)
})

test('tocar de volta e trocar a primeira metade não apaga segunda, tamanho ou adicionais', () => {
  useProductDraft.getState().open(product('calabresa').id, true)
  useProductDraft.getState().choosePizza(product('quatro-queijos'), 1)
  size()
  useProductDraft.getState().toggle('ph-g-extras', 'ph-m-burrata', 4)
  useProductDraft.getState().setActiveHalf(0)
  useProductDraft.getState().choosePizza(product('margherita'), 0)
  expect(useProductDraft.getState().chosen).toEqual({
    'ph-g-tamanho': ['ph-m-media'], 'ph-g-extras': ['ph-m-burrata'], 'ph-g-meio': ['ph-m-meio-4queijos'],
  })
})

test('meia pizza incompleta e tamanho ausente bloqueiam o carrinho', () => {
  const p = product('calabresa')
  useProductDraft.getState().open(p.id, true)
  expect(commitProductDraft(p)).toBe(false)
  expect(draftBlocking(p, {}, 'half')?.groupName).toBe('segundo sabor')
  useProductDraft.getState().choosePizza(product('quatro-queijos'), 1)
  expect(commitProductDraft(p)).toBe(false)
  size()
  expect(commitProductDraft(p)).toBe(true)
  expect(commitProductDraft(p)).toBe(false)
  expect(useCart.getState().lines).toHaveLength(1)
  expect(useCart.getState().lines[0].unitCents).toBe(7300)
})

test('editar substitui a linha e cancelar preserva o pedido original', () => {
  const p = product('calabresa')
  useProductDraft.getState().open(p.id, true)
  size()
  useProductDraft.getState().choosePizza(product('quatro-queijos'), 1)
  commitProductDraft(p)
  const original = useCart.getState().lines[0]
  useProductDraft.getState().edit(original)
  useProductDraft.getState().choosePizza(product('margherita'), 1)
  useProductDraft.getState().close()
  expect(useCart.getState().lines[0]).toEqual(original)
  useProductDraft.getState().edit(original)
  useProductDraft.getState().choosePizza(product('margherita'), 1)
  commitProductDraft(p)
  expect(useCart.getState().lines).toHaveLength(1)
  expect(useCart.getState().lines[0].pizza?.second?.name).toBe('Margherita')
  expect(useCart.getState().lines[0].unitCents).toBe(6700)
})

test('não confunde composições diferentes nem escolhe produto esgotado', () => {
  for (const other of ['quatro-queijos', 'margherita']) {
    useProductDraft.getState().open(product('calabresa').id, true)
    size()
    useProductDraft.getState().choosePizza(product(other), 1)
    commitProductDraft(product('calabresa'))
  }
  expect(useCart.getState().lines).toHaveLength(2)
  useProductDraft.getState().open(product('calabresa').id, true)
  useProductDraft.getState().choosePizza({ ...product('diavola'), soldOut: true }, 0)
  expect(useProductDraft.getState().productId).toBe('ph-p-calabresa')
})

test('cruzar ±180 graus mantém o giro curto e contínuo', () => {
  expect(angularDelta(179, -179)).toBe(2)
  expect(angularDelta(-179, 179)).toBe(-2)
  expect(angularDelta(60, 40)).toBe(-20)
})

test('tamanhos reais mudam apenas a pizza pequena e ampliam o conjunto da grande', () => {
  expect(pizzaPreviewScale(25)).toEqual({ food: 25 / 30, scene: 1 })
  expect(pizzaPreviewScale(30)).toEqual({ food: 1, scene: 1 })
  expect(pizzaPreviewScale(35).food).toBe(1)
  expect(pizzaPreviewScale(35).scene).toBeCloseTo(1.3)
})

test('zoom limita afastamento e aproximação, sem zona morta ao inverter a pinça', () => {
  expect(pinchPizzaZoom(1, 100, 150)).toBe(1.5)
  expect(pinchPizzaZoom(1, 100, 10)).toBe(.9)
  expect(pinchPizzaZoom(1, 100, 500)).toBe(1.8)
  expect(pinchPizzaZoom(1.8, 500, 450)).toBe(1.62)
  expect(pinchPizzaZoom(.9, 10, 11)).toBe(.99)
  expect(pinchPizzaZoom(1, 0, 100)).toBe(1)
})

test('cardápio, primeira metade e segunda metade usam a mesma imagem gerada por sabor', () => {
  const pizzas = PIZZA_HOUSE.catalog.products.filter((p) => p.pizza)
  expect(pizzas).toHaveLength(5)
  for (const p of pizzas) {
    expect(p.imageUrl).toBe(p.pizza!.imageUrl)
    const half = p.modifierGroups.flatMap((g) => g.modifiers).find((m) => m.pizzaFlavor?.productId === p.id)
    expect(half?.pizzaFlavor?.imageUrl).toBe(p.imageUrl)
  }
})

test('voz e toque editam a mesma composição, sem adicionar escondido', () => {
  const catalog = PIZZA_HOUSE.catalog
  useProductDraft.getState().open(product('calabresa').id, true)
  size()
  executeWaiterTool('choose_pizza_flavor', { flavor: 'quatro queijos', part: 'second' }, catalog)
  expect(buildSnapshot(catalog).openProduct?.pizza).toMatchObject({ first: 'Calabresa', second: 'Quatro queijos', mode: 'half' })
  expect(useCart.getState().lines).toHaveLength(0)
  executeWaiterTool('choose_pizza_flavor', { flavor: 'margherita', part: 'whole' }, catalog)
  expect(buildSnapshot(catalog).openProduct?.pizza).toMatchObject({ first: 'Margherita', second: null, mode: 'whole' })
  expect(draftUnitCents(product('margherita'), useProductDraft.getState().chosen)).toBe(6300)
})

test('todas as camadas de pizza e tábua existem dentro do projeto', () => {
  const urls = ['/demo/pizza-house/pizza/board.webp', ...PIZZA_HOUSE.catalog.products.flatMap((p) => p.pizza ? [p.pizza.imageUrl] : [])]
  for (const url of urls) expect(existsSync(`public${url}`), url).toBe(true)
})
