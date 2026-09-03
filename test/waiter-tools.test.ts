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
  const out = run('open_product', { product: 'pepperoni' })
  assert.match(out, /Pepperoni/)
  assert.equal(useProductDraft.getState().productId, 'zd-p-pepperoni')
})

test('um grupo obrigatório impede de adicionar, e diz o que falta', () => {
  reset()
  run('open_product', { product: 'pepperoni' })
  const refused = run('add_to_order')
  assert.match(refused, /Falta escolher Tamanho/)
  assert.equal(useCart.getState().lines.length, 0, 'nada pode entrar no pedido incompleto')
})

test('escolher a opção destrava, e o preço soma o adicional', () => {
  reset()
  run('open_product', { product: 'pepperoni' })
  run('choose_option', { option: 'média' })
  run('choose_option', { option: 'burrata' })
  assert.match(run('add_to_order'), /1× Pepperoni/)

  const [line] = useCart.getState().lines
  assert.equal(line.unitCents, 5900 + 800 + 900)
  assert.deepEqual(line.modifiers.map((m) => m.name).sort(), ['Burrata', 'Média 30cm'])
})

test('um grupo de escolha única troca, não acumula', () => {
  reset()
  run('open_product', { product: 'pepperoni' })
  run('choose_option', { option: 'média' })
  run('choose_option', { option: 'grande' })
  const chosen = useProductDraft.getState().chosen['zd-g-tamanho']
  assert.deepEqual(chosen, ['zd-m-grande'], 'tamanho é radio, não checkbox')
})

test('prato esgotado não abre', () => {
  reset()
  const out = run('open_product', { product: 'burrata' })
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
  const out = run('search_menu', { query: 'pepperoni' })
  assert.match(out, /Pepperoni/)
})

test('não existe ferramenta que pague', () => {
  const names = WAITER_TOOLS.map((t) => t.name)
  for (const forbidden of ['pay', 'pagar', 'charge', 'confirm_payment', 'place_order']) {
    assert.ok(!names.includes(forbidden), `${forbidden} não pode existir`)
  }
})

test('go_to_payment leva até a tela e PARA', () => {
  reset()
  run('open_product', { product: 'refrigerante' })
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
  run('open_product', { product: 'refrigerante' })
  run('add_to_order')
  run('change_line_quantity', { product: 'refrigerante', quantity: 0 })
  assert.equal(useCart.getState().lines.length, 0)
})

test('o snapshot conta o que bloqueia agora', () => {
  reset()
  run('open_product', { product: 'pepperoni' })
  const snap = buildSnapshot(catalog)
  assert.equal(snap.blocking?.groupName, 'Tamanho')
  assert.equal(snap.openProduct?.name, 'Pepperoni')
  assert.equal(snap.cart.count, 0)
})

test('toda ferramenta tem schema declarado', () => {
  for (const tool of WAITER_TOOLS) {
    assert.ok(tool.description.length > 20, `${tool.name} precisa de descrição útil`)
    assert.equal(tool.parameters.type, 'object', `${tool.name} sem schema`)
  }
})

test('acento não pode derrubar o pedido', () => {
  // "média".includes("media") é false. Um transcript de voz nunca escreve
  // acento de forma confiável, e um teclado de totem também não — então o
  // garçom recusaria uma opção que o cliente acabou de dizer.
  reset()
  run('open_product', { product: 'pepperoni' })
  assert.match(run('choose_option', { option: 'media' }), /marcado/i)
  assert.deepEqual(useProductDraft.getState().chosen['zd-g-tamanho'], ['zd-m-media'])
})

test('acento também não derruba busca nem categoria', () => {
  reset()
  assert.match(run('open_category', { category: 'sobremesas' }), /Sobremesas/)
  assert.match(run('search_menu', { query: 'tiramisu' }), /Tiramisù/)
})

test('quantidade fora da faixa é presa no limite', () => {
  reset()
  run('open_product', { product: 'refrigerante' })
  run('set_quantity', { quantity: 999 })
  assert.equal(useProductDraft.getState().quantity, 99)
  run('set_quantity', { quantity: -3 })
  assert.equal(useProductDraft.getState().quantity, 1)
})

test('o erro apaga sozinho — ele é aviso, não estado', async () => {
  // Deixado aceso, a faixa fica vermelha pelo resto da visita, inclusive
  // depois de o cliente já ter conseguido pedir. Pior: a PRÓXIMA pessoa
  // encontra o painel gritando sobre uma falha que passou.
  const { useWaiter } = await import('@/waiter/useWaiter')
  useWaiter.getState().reset()

  useWaiter.getState().setError('a voz falhou')
  assert.equal(useWaiter.getState().error, 'a voz falhou')
  assert.equal(useWaiter.getState().phase, 'error')

  await new Promise((resolve) => setTimeout(resolve, 8_200))
  assert.equal(useWaiter.getState().error, null, 'o erro ficou na tela para sempre')
  assert.equal(useWaiter.getState().phase, 'idle')
}, 12_000)

test('uma tentativa nova apaga o erro na hora', async () => {
  const { useWaiter } = await import('@/waiter/useWaiter')
  useWaiter.getState().reset()
  useWaiter.getState().setError('a voz falhou')
  useWaiter.getState().setError(null)
  assert.equal(useWaiter.getState().error, null)
  assert.equal(useWaiter.getState().phase, 'idle')
})

// ---------------------------------------------------------------------------
// Antes do cardápio.
//
// Quem toca no orbe na tela inicial não deveria precisar tocar em mais nada até
// o cardápio. Estas provas cobrem o caminho que faltava — duas telas que o
// garçom atravessava mudo enquanto o cliente respondia tudo no dedo.
// ---------------------------------------------------------------------------

test('o garçom responde "comer aqui ou levar" e a tela anda', () => {
  reset()
  useTotemSession.getState().start()
  assert.equal(useTotemSession.getState().step, 'mode')

  const out = run('set_service_mode', { mode: 'takeaway' })
  assert.match(out, /levar/i)
  assert.equal(useTotemSession.getState().mode, 'takeaway')
  assert.equal(useTotemSession.getState().step, 'identify', 'a tela tem de avançar junto')
})

test('o modo não pode ser trocado depois que a pergunta passou', () => {
  reset()
  useTotemSession.getState().start()
  run('set_service_mode', { mode: 'dine_in' })
  useTotemSession.getState().identify(null)

  const late = run('set_service_mode', { mode: 'takeaway' })
  assert.match(late, /já está marcado/i)
  assert.equal(useTotemSession.getState().mode, 'dine_in', 'o cliente já viu o preço deste modo')
})

test('modo inválido não vira escolha', () => {
  reset()
  useTotemSession.getState().start()
  const out = run('set_service_mode', { mode: 'delivery' })
  assert.match(out, /inválido/i)
  assert.equal(useTotemSession.getState().mode, null)
})

test('pular a identificação leva ao cardápio SEM guardar dado nenhum', () => {
  reset()
  useTotemSession.getState().start()
  run('set_service_mode', { mode: 'dine_in' })

  const out = run('skip_identification')
  assert.match(out, /cardápio/i)
  assert.equal(useTotemSession.getState().step, 'menu')
  assert.equal(useTotemSession.getState().customer, null)
})

test('não existe ferramenta que digite telefone ou CPF', () => {
  // Falar o próprio número em voz alta numa fila é constrangedor, e onze
  // dígitos mal transcritos acham o cadastro de outra pessoa. O teclado é do
  // cliente, e esta prova é o que impede alguém de "ajudar" mais tarde.
  const names = WAITER_TOOLS.map((t) => t.name).join(' ')
  assert.doesNotMatch(names, /phone|telefone|cpf|document|identify_/i)
})
