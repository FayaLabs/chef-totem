import { expect, test } from 'vitest'
import { burgerPoses, burgerShadowPose, pilotBurger } from '@/burger/pilot'

const dimensions = { 'brioche-top': { width: 1000, height: 630 }, 'brioche-bottom': { width: 1000, height: 620 },
  blend: { width: 1000, height: 670 }, cheddar: { width: 1000, height: 510 }, bacon: { width: 1000, height: 570 }, 'onion-crispy': { width: 1000, height: 480 } }

test('sombra acompanha a base visível e suaviza ao abrir; cena vazia não tem sombra', () => {
  expect(burgerShadowPose([], [], dimensions, false)).toBeNull()
  for (const double of [false, true]) for (const open of [false, true]) {
    const layers = pilotBurger({ double }), poses = burgerPoses(layers, dimensions, open)
    const shadow = burgerShadowPose(layers, poses, dimensions, open)!
    const lowerEdge = Math.max(...poses.map((p, i) => p.centerY + p.width * dimensions[layers[i].asset].height / dimensions[layers[i].asset].width / 2))
    expect(shadow.top + 3).toBeCloseTo(lowerEdge)
    expect(shadow.left + shadow.width / 2).toBeCloseTo(50)
    expect(shadow.top + shadow.height).toBeLessThanOrEqual(100)
    expect(shadow.opacity).toBe(open ? .7 : 1)
  }
})

test('cheddar permanece preso à mesma carne nos dois estados', () => {
  for (const double of [false, true]) for (const open of [false, true]) {
    const layers = pilotBurger({ double })
    const poses = burgerPoses(layers, dimensions, open)
    for (const index of double ? [0, 1] : [0]) {
      const meat = poses.find((p) => p.id === `meat-${index}`)!
      const cheese = poses.find((p) => p.id === `cheese-${index}`)!
      expect(cheese.group).toBe(meat.group)
      expect(cheese.centerY).toBeLessThan(meat.centerY)
    }
  }
})

test('o encaixe relativo entre carne e cheddar não muda ao abrir', () => {
  const layers = pilotBurger()
  const relativeOffset = (open: boolean) => {
    const poses = burgerPoses(layers, dimensions, open)
    const meat = poses.find((p) => p.id === 'meat-0')!
    const cheese = poses.find((p) => p.id === 'cheese-0')!
    return (cheese.centerY - meat.centerY) / meat.width
  }
  expect(relativeOffset(true)).toBeCloseTo(relativeOffset(false), 6)
})

test('retiradas e dupla carne resolvem camadas determinísticas, sem ingrediente fantasma', () => {
  const simple = pilotBurger({ bacon: false, onion: false, cheese: false })
  expect(simple.map((l) => l.id)).toEqual(['bottom', 'meat-0', 'top'])
  expect(pilotBurger({ double: true }).filter((l) => l.asset === 'blend')).toHaveLength(2)
  expect(pilotBurger({ double: true }).filter((l) => l.asset === 'cheddar')).toHaveLength(2)
})

test('todas as combinações cabem no enquadramento sem mudar botões', () => {
  for (const open of [false, true]) for (const double of [false, true]) for (const cheese of [false, true]) {
    const layers = pilotBurger({ double, cheese })
    const poses = burgerPoses(layers, dimensions, open)
    poses.forEach((pose, i) => {
      const size = dimensions[layers[i].asset]
      const halfHeight = pose.width * size.height / size.width / 2
      expect(pose.centerY - halfHeight).toBeGreaterThanOrEqual(6.99)
      expect(pose.centerY + halfHeight).toBeLessThanOrEqual(93.01)
      expect(pose.width).toBeLessThanOrEqual(80.01)
    })
  }
})
