import { expect, test } from 'vitest'
import { layerDragOutcome, visibleBurgerLayers } from '@/burger/layer-gestures'
import { pilotBurger, burgerPoses } from '@/burger/pilot'

const bounds = { left: 200, right: 700, top: 100, bottom: 700 }

test('toque e deslocamento curto nunca removem uma camada', () => {
  expect(layerDragOutcome('remove', { x: 200, y: 300 }, { x: 192, y: 300 }, bounds)).toBe(false)
  expect(layerDragOutcome('remove', { x: 400, y: 300 }, { x: 400, y: 300 }, bounds)).toBe(false)
})

test('retirar exige sair da montagem, com margem contra escorregões', () => {
  expect(layerDragOutcome('remove', { x: 400, y: 300 }, { x: 500, y: 450 }, bounds)).toBe(false)
  expect(layerDragOutcome('remove', { x: 400, y: 300 }, { x: 190, y: 450 }, bounds)).toBe(false)
  expect(layerDragOutcome('remove', { x: 400, y: 300 }, { x: 100, y: 450 }, bounds)).toBe(true)
})

test('recolocar exige soltar dentro da montagem, não apenas perto dela', () => {
  expect(layerDragOutcome('restore', { x: 400, y: 900 }, { x: 400, y: 400 }, bounds)).toBe(true)
  expect(layerDragOutcome('restore', { x: 400, y: 900 }, { x: 205, y: 400 }, bounds)).toBe(false)
  expect(layerDragOutcome('restore', { x: 400, y: 900 }, { x: 400, y: 850 }, bounds)).toBe(false)
})

test('o queijo acompanha a carne retirada e uma retirada explícita de queijo é preservada', () => {
  const layers = pilotBurger({ double: true })
  const removed = new Set(['meat-0'])
  expect(visibleBurgerLayers(layers, removed).map((layer) => layer.id)).not.toContain('cheese-0')
  expect(visibleBurgerLayers(layers, removed).map((layer) => layer.id)).toContain('cheese-1')
  removed.add('cheese-0'); removed.delete('meat-0')
  expect(visibleBurgerLayers(layers, removed).map((layer) => layer.id)).toContain('meat-0')
  expect(visibleBurgerLayers(layers, removed).map((layer) => layer.id)).not.toContain('cheese-0')
})

test('esvaziar a montagem não produz posições inválidas', () => {
  const layers = pilotBurger()
  expect(visibleBurgerLayers(layers, new Set(layers.map((layer) => layer.id)))).toEqual([])
  expect(burgerPoses([], {}, true)).toEqual([])
})
