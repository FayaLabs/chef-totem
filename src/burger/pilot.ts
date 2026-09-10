import type { BurgerAsset } from './types'
export type BurgerPilotAsset = BurgerAsset
export interface BurgerLayer {
  id: string
  asset: BurgerPilotAsset
  label: string
  /** Relative to the bread diameter, not the size of the transparent image canvas. */
  diameter: number
  thickness: number
  /** Melted cheese remains attached to its patty in both views. */
  attached?: boolean
}
export interface BurgerLayerPose { id: string; width: number; centerX: number; centerY: number; group: number }
export const BURGER_ASSETS = '/demo/maxburger/burger'

/** Shared contact plane for the live scene and its cached static photograph. */
export function burgerShadowPose(layers: BurgerLayer[], poses: BurgerLayerPose[], dimensions: Record<string, { width: number; height: number }>, open: boolean) {
  if (!layers.length) return null
  const edges = poses.map((pose, i) => {
    const size = dimensions[layers[i].asset]
    return pose.centerY + pose.width * (size ? size.height / size.width : .55) / 2
  })
  const index = edges.indexOf(Math.max(...edges))
  const base = poses[index], width = base.width * 1.12
  return { left: base.centerX - width / 2, top: edges[index] - 3, width, height: open ? 8 : 6, opacity: open ? .7 : 1 }
}

export function pilotBurger({ bacon = true, onion = true, cheese = true, double = false }: {
  bacon?: boolean; onion?: boolean; cheese?: boolean; double?: boolean
} = {}): BurgerLayer[] {
  const layers: BurgerLayer[] = [{ id: 'bottom', asset: 'brioche-bottom', label: 'Brioche', diameter: 1, thickness: .12 }]
  for (let i = 0; i < (double ? 2 : 1); i++) {
    layers.push({ id: `meat-${i}`, asset: 'blend', label: 'Carne', diameter: 1.02, thickness: .17 })
    if (cheese) layers.push({ id: `cheese-${i}`, asset: 'cheddar', label: 'Cheddar derretido', diameter: 1.04, thickness: .025, attached: true })
  }
  if (bacon) layers.push({ id: 'bacon', asset: 'bacon', label: 'Bacon', diameter: 1.02, thickness: .06 })
  if (onion) layers.push({ id: 'onion', asset: 'onion-crispy', label: 'Cebola crispy', diameter: .88, thickness: .065 })
  layers.push({ id: 'top', asset: 'brioche-top', label: 'Brioche', diameter: 1, thickness: .28 })
  return layers
}

/** Camera-aligned layer placement. Global fit never changes touch target sizes. */
export function burgerPoses(layers: BurgerLayer[], dimensions: Record<string, { width: number; height: number }>, open: boolean): BurgerLayerPose[] {
  if (!layers.length) return []
  let level = 0, group = -1
  const raw = layers.map((layer, index) => {
    const size = dimensions[layer.asset]
    const height = layer.diameter * (size ? size.height / size.width : .55)
    if (!layer.attached) { group++; if (index && open) level += .24 }
    // Visible lower edge lies below the layer's contact plane in the elevated camera.
    const y = -level + layer.diameter * .19 - height / 2
    level += layer.thickness
    return { id: layer.id, width: layer.diameter, height, centerY: y, group }
  })
  const min = Math.min(...raw.map((p) => p.centerY - p.height / 2))
  const max = Math.max(...raw.map((p) => p.centerY + p.height / 2))
  const fit = Math.min(80 / Math.max(...raw.map((p) => p.width)), 86 / (max - min))
  const centers = new Map<number, number>()
  layers.forEach((layer, index) => {
    if (!layer.attached) centers.set(raw[index].group, open ? layer.asset === 'bacon' ? 38 : layer.asset === 'onion-crispy' ? 62 : 50 : 50)
  })
  return raw.map((p) => ({ id: p.id, width: p.width * fit, centerX: centers.get(p.group) ?? 50,
    centerY: 50 + (p.centerY - (min + max) / 2) * fit, group: p.group }))
}
