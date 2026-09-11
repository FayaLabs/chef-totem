import assert from 'node:assert/strict'
import { test } from 'vitest'
import { stepDone, stepFull, stepMinimum } from '../src/menu/useStepFlow'
import { stepHint } from '../src/menu/StepHeading'
import type { TotemModifierGroup } from '../src/menu/types'

const group = (over: Partial<TotemModifierGroup> = {}): TotemModifierGroup => ({
  id: 'g1',
  name: 'Ponto da carne',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [],
  ...over,
})

test('etapa obrigatória só fecha com o mínimo escolhido', () => {
  const g = group({ minSelections: 2, maxSelections: 3 })
  assert.equal(stepMinimum(g), 2)
  assert.equal(stepDone(g, { g1: ['a'] }), false)
  assert.equal(stepDone(g, { g1: ['a', 'b'] }), true)
})

test('etapa opcional já nasce fechada — ela nunca trava o pedido', () => {
  assert.equal(stepDone(group({ required: false, minSelections: 0 }), {}), true)
})

// A tela só desce quando não cabe mais escolha. Um grupo de adicionais com
// três vagas fugindo do dedo no primeiro toque faria o cliente perder os
// outros dois.
test('a tela só desce quando o grupo encheu', () => {
  const extras = group({ required: false, minSelections: 0, maxSelections: 3 })
  assert.equal(stepFull(extras, { g1: ['a'] }), false)
  assert.equal(stepFull(extras, { g1: ['a', 'b', 'c'] }), true)
  assert.equal(stepFull(group(), { g1: ['a'] }), true)
})

test('a dica diz o que falta antes, e o que foi feito depois', () => {
  assert.equal(stepHint(true, 1, 1, 0), 'Escolha 1')
  assert.equal(stepHint(true, 2, 3, 1), 'Escolha 2')
  assert.equal(stepHint(true, 1, 1, 1), 'Pronto')
  assert.equal(stepHint(false, 0, 3, 0), 'Até 3')
  assert.equal(stepHint(false, 0, 1, 0), 'Opcional')
  assert.equal(stepHint(false, 0, 3, 2), '2 escolhidos')
})
