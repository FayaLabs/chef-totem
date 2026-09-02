import assert from 'node:assert/strict'
import { test } from 'vitest'
import { computeTotals, offerDiscountCents, offerLabel } from '../src/orders/totals'
import { maskPhone, receiptMessage } from '../src/orders/receipt-delivery'
import type { CustomerOffer } from '../src/session/customer-lookup'

const percent = (value: number, min = 0): CustomerOffer => ({
  code: 'CLUBE',
  title: 'Clube Chef',
  method: 'percentage',
  type: 'order',
  value,
  minSubtotalCents: min,
})

const fixed = (reais: number, min = 0): CustomerOffer => ({
  code: 'VALE',
  title: 'Vale',
  method: 'fixed',
  type: 'order',
  value: reais,
  minSubtotalCents: min,
})

test('sem oferta e sem crédito o total é o subtotal', () => {
  const t = computeTotals({ subtotalCents: 3199 })
  assert.deepEqual(t, { subtotalCents: 3199, offerCents: 0, creditCents: 0, totalCents: 3199 })
})

test('percentual arredonda para o centavo', () => {
  // 10% de R$ 31,99 = R$ 3,199 — o cliente paga R$ 28,79, não R$ 28,791.
  assert.equal(offerDiscountCents(3199, percent(10)), 320)
  assert.equal(computeTotals({ subtotalCents: 3199, offer: percent(10) }).totalCents, 2879)
})

test('oferta abaixo do mínimo não vale', () => {
  assert.equal(offerDiscountCents(2999, percent(10, 3000)), 0)
  assert.equal(offerDiscountCents(3000, percent(10, 3000)), 300)
})

test('desconto fixo vem em reais e sai em centavos', () => {
  assert.equal(offerDiscountCents(5000, fixed(12.5)), 1250)
})

test('desconto nunca passa do subtotal', () => {
  const t = computeTotals({ subtotalCents: 1000, offer: fixed(50) })
  assert.equal(t.offerCents, 1000)
  assert.equal(t.totalCents, 0)
})

test('a oferta vem ANTES do crédito', () => {
  // A ordem é a diferença entre o cliente sair com R$ 8,00 de saldo ou zerado.
  const t = computeTotals({ subtotalCents: 10000, offer: percent(20), availableCreditCents: 5000 })
  assert.equal(t.offerCents, 2000)
  assert.equal(t.creditCents, 5000)
  assert.equal(t.totalCents, 3000)
})

test('o crédito consumido nunca passa do que resta a pagar', () => {
  const t = computeTotals({ subtotalCents: 2000, offer: percent(50), availableCreditCents: 5000 })
  assert.equal(t.creditCents, 1000, 'só 10 reais restavam a pagar')
  assert.equal(t.totalCents, 0)
})

test('recusar o crédito não recusa a oferta', () => {
  const t = computeTotals({
    subtotalCents: 10000,
    offer: percent(20),
    availableCreditCents: 5000,
    useCredit: false,
  })
  assert.equal(t.offerCents, 2000)
  assert.equal(t.creditCents, 0)
  assert.equal(t.totalCents, 8000)
})

test('carrinho vazio não gera desconto negativo', () => {
  const t = computeTotals({ subtotalCents: 0, offer: percent(30), availableCreditCents: 9999 })
  assert.deepEqual(t, { subtotalCents: 0, offerCents: 0, creditCents: 0, totalCents: 0 })
})

test('o rótulo da oferta diz a unidade certa', () => {
  assert.equal(offerLabel(percent(15)), '15% off')
  assert.equal(offerLabel(fixed(7.5)), 'R$ 7.50 off')
})

test('o telefone só mostra os quatro últimos', () => {
  const masked = maskPhone('11987651234')
  assert.ok(masked.includes('1234'))
  assert.ok(!masked.includes('98765'), 'o miolo do número não pode aparecer numa tela pública')
})

test('a mensagem do WhatsApp carrega senha, total e código', () => {
  const body = receiptMessage({
    phone: '11987651234',
    order: { orderId: 'o1', ticket: '#042', referenceNumber: 'TOTEM-000042', totalCents: 3199 },
    mode: 'takeaway',
    customerName: 'Marina',
  })
  assert.ok(body.includes('#042'))
  assert.ok(body.includes('TOTEM-000042'))
  assert.ok(body.includes('31,99'))
  assert.ok(body.includes('Marina'))
  assert.ok(body.includes('balcão'), 'takeaway manda a pessoa ao balcão, não à mesa')
})
