// Onde a faixa do garçom aparece — a regra, sem navegador.
//
// Ela nasceu de um defeito visível: na tela de pagamento a faixa subia por cima
// da opção PIX e, sem nada para dizer, exibia o convite padrão "peça como
// pediria a Bia" logo acima do botão PAGAR. Oferecer comida a quem já está com
// o cartão na mão é o oposto do que este painel promete.
import assert from 'node:assert/strict'
import { test } from 'vitest'
import { presenceFor } from '@/waiter/presence'

test('quem não chamou o garçom não o encontra antes do cardápio', () => {
  assert.equal(presenceFor('mode', false, false, false), 'off')
  assert.equal(presenceFor('identify', false, false, false), 'off')
})

test('quem tocou no orbe é conduzido desde o primeiro passo', () => {
  assert.equal(presenceFor('mode', false, true, false), 'leading')
  assert.equal(presenceFor('identify', false, true, false), 'leading')
})

test('no cardápio ele está sempre, chamado ou não', () => {
  assert.equal(presenceFor('menu', false, false, false), 'ordering')
})

test('no pagamento ele só aparece se tiver o que dizer sobre ESTA tela', () => {
  assert.equal(presenceFor('payment', false, true, false), 'off', 'sem frase, sem faixa')
  assert.equal(presenceFor('receipt', false, true, false), 'off')
  assert.equal(presenceFor('payment', false, true, true), 'guiding')
  assert.equal(presenceFor('receipt', false, true, true), 'guiding')
})

test('quem pegou o microfone no meio do caminho também é orientado no pagamento', () => {
  // Sem `engaged`: ele não tocou no orbe da tela inicial, tocou no microfone no
  // cardápio. Está sendo atendido do mesmo jeito.
  assert.equal(presenceFor('payment', false, false, true), 'guiding')
})

test('assistente desligado é assistente invisível em toda tela', () => {
  for (const step of ['mode', 'identify', 'menu', 'payment', 'receipt'] as const) {
    assert.equal(presenceFor(step, true, true, true), 'off')
  }
})

test('a tela de atrair nunca tem faixa — lá o orbe é o convite', () => {
  assert.equal(presenceFor('attract', false, true, true), 'off')
})
