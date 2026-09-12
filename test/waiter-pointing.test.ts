// O gesto do garçom: falar de um prato acende o cartão dele na grade.
//
// O gesto está DESLIGADO (ver `POINTING_ENABLED`), então os testes que esperam
// a grade acender só valem quando ele voltar. Eles ficam aqui, ligados ao mesmo
// interruptor, porque a regra que eles descrevem continua sendo a certa — o que
// mudou é QUANDO apontar, não como. E fica um teste no lugar deles cobrando o
// que vale hoje: com o gesto desligado, a fala não mexe na tela de ninguém.
import assert from 'node:assert/strict'
import { beforeAll, beforeEach, test, vi } from 'vitest'
import { POINTING_ENABLED, pointWhileSpeaking, spokenProducts } from '@/waiter/pointing'
import { useWaiter } from '@/waiter/useWaiter'
import { useCart } from '@/cart/useCart'
import { useMenuUi } from '@/menu/useMenuUi'
import { useProductDraft } from '@/menu/useProductDraft'
import { useTotemSession } from '@/session/useTotemSession'
import { prefetchCatalog } from '@/menu/useCatalog'
import { createDemoCatalog } from '@/menu/demo-catalog'
import type { TotemCatalog } from '@/menu/types'

let catalog: TotemCatalog
beforeAll(async () => {
  catalog = await createDemoCatalog().load()
  // O módulo lê o cardápio já carregado, e quem o carrega é a prébusca. Sem o
  // demo aqui ela iria ao Supabase de verdade — um teste de gesto de tela não
  // pede rede nem login de aparelho.
  vi.stubEnv('VITE_TOTEM_CATALOG', 'demo')
  await prefetchCatalog()
})

beforeEach(() => {
  useCart.getState().clear()
  useProductDraft.getState().close()
  useMenuUi.getState().reset()
  useTotemSession.getState().reset()
  useWaiter.getState().reset()
  useTotemSession.setState({ step: 'menu' })
})

const first = () => catalog.products.find((p) => !p.soldOut)!

test.skipIf(!POINTING_ENABLED)('a fala que nomeia um prato acende o cartão dele', () => {
  const product = first()
  pointWhileSpeaking(`O ${product.name} sai rápido e é o mais pedido.`)
  assert.equal(useMenuUi.getState().highlightId, product.id)
})

test.skipIf(!POINTING_ENABLED)('acento e caixa não atrapalham — transcrição não soletra acento', () => {
  const accented = catalog.products.find((p) => /[áéíóúâêôãõç]/i.test(p.name))
  if (!accented) return
  const plain = accented.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  pointWhileSpeaking(`recomendo o ${plain}`)
  assert.equal(useMenuUi.getState().highlightId, accented.id)
})

// Comparar dois pratos apontando para um só apaga o outro lado da comparação.
test('dois pratos na mesma frase não acendem nada', () => {
  const [a, b] = catalog.products.filter((p) => !p.soldOut)
  pointWhileSpeaking(`O ${a.name} é mais leve que o ${b.name}.`)
  assert.equal(useMenuUi.getState().highlightId, null)
})

test('com um prato aberto a grade fica quieta: o cliente já passou de olhar', () => {
  const product = first()
  useProductDraft.getState().open(product.id)
  pointWhileSpeaking(`O ${product.name} vem com tudo isso aqui.`)
  assert.equal(useMenuUi.getState().highlightId, null)
})

test('o que já está no pedido não é mais vitrine', () => {
  const product = first()
  useCart.getState().add(product, 1, [])
  pointWhileSpeaking(`Seu ${product.name} já está no pedido.`)
  assert.equal(useMenuUi.getState().highlightId, null)
})

test('fora do cardápio não há grade para acender', () => {
  useTotemSession.setState({ step: 'payment' })
  const product = first()
  pointWhileSpeaking(`O ${product.name} é uma boa.`)
  assert.equal(useMenuUi.getState().highlightId, null)
})

test.skipIf(!POINTING_ENABLED)('o turno do garçom aponta sozinho; o do cliente não', () => {
  const product = first()
  useWaiter.getState().pushTurn({ id: 'c1', from: 'customer', text: `quero o ${product.name}` })
  assert.equal(useMenuUi.getState().highlightId, null)
  useWaiter.getState().pushTurn({ id: 'w1', from: 'waiter', text: `O ${product.name} é o mais pedido.` })
  assert.equal(useMenuUi.getState().highlightId, product.id)
})

test('spokenProducts casa pelo nome inteiro, não por pedaço de palavra', () => {
  const product = first()
  assert.deepEqual(spokenProducts(`vai um ${product.name}?`, catalog).map((p) => p.id), [product.id])
  assert.deepEqual(spokenProducts('nada aqui combina', catalog), [])
})

test.skipIf(POINTING_ENABLED)('com o gesto desligado, falar de um prato não mexe na grade', () => {
  // O motivo de ter desligado: a ferramenta e este piso trocavam categoria e
  // limpavam o filtro para conseguir acender — numa grade que pode estar atrás
  // de um prato aberto, que o cliente não está vendo e não pediu para mexer.
  const product = first()
  useMenuUi.getState().openCategory(product.categoryId ?? null)
  pointWhileSpeaking(`O ${product.name} sai rápido e é o mais pedido.`)
  assert.equal(useMenuUi.getState().highlightId, null)
  assert.equal(useMenuUi.getState().categoryId, product.categoryId ?? null, 'a categoria escolhida pelo cliente fica')
})
