// The waiter's brain, exercised with no network and no microphone.
//
// This is the point of splitting brain from transport: every rule that decides
// whether a customer gets the right plate is testable in milliseconds, and the
// only thing left for a human to check is whether the voice sounds right.
import assert from 'node:assert/strict'
import { beforeAll, test } from 'vitest'
import { WAITER_TOOLS, executeWaiterTool } from '@/waiter/tools'
import { buildSnapshot } from '@/waiter/snapshot'
import { useCart } from '@/cart/useCart'
import { useProductDraft } from '@/menu/useProductDraft'
import { useMenuUi } from '@/menu/useMenuUi'
import { useTotemSession } from '@/session/useTotemSession'
import { createDemoCatalog } from '@/menu/demo-catalog'
import type { TotemCatalog } from '@/menu/types'

let catalog: TotemCatalog
beforeAll(async () => {
  catalog = await createDemoCatalog().load()
})
const run = (name: string, args: Record<string, unknown> = {}) => executeWaiterTool(name, args, catalog)

function reset() {
  useCart.getState().clear()
  useProductDraft.getState().close()
  useMenuUi.getState().reset()
  useTotemSession.getState().reset()
}

test('abrir um prato move a tela, não só os dados', () => {
  reset()
  const out = run('open_product', { product: 'calabresa' })
  assert.match(out, /Calabresa/)
  assert.equal(useProductDraft.getState().productId, 'p-calabresa')
})

test('um grupo obrigatório impede de adicionar, e diz o que falta', () => {
  reset()
  run('open_product', { product: 'calabresa' })
  const refused = run('add_to_order')
  assert.match(refused, /Falta escolher Tamanho/)
  assert.equal(useCart.getState().lines.length, 0, 'nada pode entrar no pedido incompleto')
})

test('escolher a opção destrava, e o preço soma o adicional', () => {
  reset()
  run('open_product', { product: 'calabresa' })
  run('choose_option', { option: 'média' })
  run('choose_option', { option: 'borda' })
  assert.match(run('add_to_order'), /1× Calabresa/)

  const [line] = useCart.getState().lines
  assert.equal(line.unitCents, 5900 + 800 + 900)
  assert.deepEqual(line.modifiers.map((m) => m.name).sort(), ['Borda recheada', 'Média'])
})

test('um grupo de escolha única troca, não acumula', () => {
  reset()
  run('open_product', { product: 'calabresa' })
  run('choose_option', { option: 'média' })
  run('choose_option', { option: 'grande' })
  const chosen = useProductDraft.getState().chosen['g-size']
  assert.deepEqual(chosen, ['m-grande'], 'tamanho é radio, não checkbox')
})

test('prato esgotado não abre', () => {
  reset()
  const out = run('open_product', { product: 'cacio' })
  assert.match(out, /esgotado/i)
  assert.equal(useProductDraft.getState().productId, null)
})

test('não inventa prato que não existe', () => {
  reset()
  assert.match(run('open_product', { product: 'sushi' }), /não achei/i)
  assert.match(run('search_menu', { query: 'sushi' }), /nada no cardápio/i)
})

test('search_menu acha por ingrediente da descrição', () => {
  reset()
  const out = run('search_menu', { query: 'calabresa' })
  assert.match(out, /Calabresa/)
})

test('não existe ferramenta que pague', () => {
  const names = WAITER_TOOLS.map((t) => t.name)
  for (const forbidden of ['pay', 'pagar', 'charge', 'confirm_payment', 'place_order']) {
    assert.ok(!names.includes(forbidden), `${forbidden} não pode existir`)
  }
})

test('go_to_payment leva até a tela e PARA', () => {
  reset()
  run('open_product', { product: 'coca' })
  run('add_to_order')
  run('go_to_payment')
  assert.equal(useTotemSession.getState().step, 'payment')
  assert.equal(useTotemSession.getState().placed, null, 'nada foi cobrado nem gravado')
})

test('go_to_payment recusa carrinho vazio', () => {
  reset()
  assert.match(run('go_to_payment'), /vazio/i)
  assert.equal(useTotemSession.getState().step, 'attract')
})

test('mudar quantidade para zero remove a linha', () => {
  reset()
  run('open_product', { product: 'coca' })
  run('add_to_order')
  run('change_line_quantity', { product: 'coca', quantity: 0 })
  assert.equal(useCart.getState().lines.length, 0)
})

test('o snapshot conta o que bloqueia agora', () => {
  reset()
  run('open_product', { product: 'calabresa' })
  const snap = buildSnapshot(catalog)
  assert.equal(snap.blocking?.groupName, 'Tamanho')
  assert.equal(snap.openProduct?.name, 'Calabresa')
  assert.equal(snap.cart.count, 0)
})

test('toda ferramenta tem schema declarado', () => {
  for (const tool of WAITER_TOOLS) {
    assert.ok(tool.description.length > 20, `${tool.name} precisa de descrição útil`)
    assert.equal(tool.parameters.type, 'object', `${tool.name} sem schema`)
  }
})
