import type { BurgerLayer } from './pilot'

export interface LayerPoint { x: number; y: number }
export interface LayerBounds { left: number; right: number; top: number; bottom: number }
export type LayerDragDirection = 'remove' | 'restore'

export const LAYER_DRAG_THRESHOLD = 12

/** Removing a protein carries its melted topping with it; restoring brings
 * it back unless that topping was explicitly removed on its own. */
export function visibleBurgerLayers(layers: BurgerLayer[], removed: ReadonlySet<string>) {
  return layers.filter((layer, index) => !removed.has(layer.id)
    && !(layer.attached && index > 0 && removed.has(layers[index - 1].id)))
}

/** A tap never removes food, and a small slip near an edge snaps back. */
export function layerDragOutcome(direction: LayerDragDirection, start: LayerPoint, end: LayerPoint, bounds: LayerBounds): boolean {
  if (Math.hypot(end.x - start.x, end.y - start.y) < LAYER_DRAG_THRESHOLD) return false
  const inset = direction === 'restore' ? 12 : -18
  const inside = end.x >= bounds.left + inset && end.x <= bounds.right - inset
    && end.y >= bounds.top + inset && end.y <= bounds.bottom - inset
  return direction === 'restore' ? inside : !inside
}
