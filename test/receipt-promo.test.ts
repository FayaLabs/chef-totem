// O cupom como canal: numa feira ele é a única coisa que a pessoa leva do
// estande, e quem o segura é quem decide se compra o painel.
import assert from 'node:assert/strict'
import { test, vi } from 'vitest'
import { customerTicket, fairPromo, qrMatrix } from '@/orders/receipt-printer'

const order = {
  orderId: 'x',
  ticket: '#042',
  lines: [],
  referenceNumber: 'TOTEM-000042',
  totalCents: 3600,
  paid: true,
}

test('o cupom convida para o ChefControl, com endereço e QR', () => {
  const ticket = customerTicket(order, 'takeaway')
  assert.match(ticket.promo?.headline ?? '', /ChefControl/)
  assert.match(ticket.promo?.offer ?? '', /1 MES GRATIS/)
  assert.equal(ticket.promo?.site, 'chefcontrol.ai')
  assert.equal(ticket.promo?.qr, 'https://chefcontrol.ai/qr')
})

test('a oferta é escrita sem acento, porque o papel é CP860 e a frase é gritada', () => {
  // Caixa alta com acento no cupom depende da tabela de código do aparelho
  // acertar cada letra; sem acento, qualquer impressora imprime a mesma frase.
  assert.doesNotMatch(fairPromo()?.offer ?? '', /[ÀÁÂÃÄÇÉÊÍÓÔÕÚ]/)
})

test('VITE_TOTEM_PROMO=off devolve o cupom de sempre', () => {
  // Num restaurante de verdade o cliente não leva para casa um anúncio do
  // totem que o restaurante comprou.
  vi.stubEnv('VITE_TOTEM_PROMO', 'off')
  assert.equal(fairPromo(), undefined)
  vi.unstubAllEnvs()
})

test('o QR do convite é uma matriz quadrada de verdade', () => {
  const matrix = qrMatrix('https://chefcontrol.ai/qr')
  assert.ok(matrix.length >= 21, 'um QR válido tem ao menos 21 módulos')
  assert.ok(matrix.every((row) => row.length === matrix.length), 'quadrado')
  // O canto superior esquerdo é sempre um localizador preto — se isto falhar,
  // o que sai no papel é ruído.
  assert.equal(matrix[0][0], true)
})
