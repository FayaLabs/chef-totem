export const PIZZA_ZOOM_MIN = .9
export const PIZZA_ZOOM_MAX = 1.8
export const PIZZA_ZOOM_IDLE_MS = 3000

/** Incremental distance avoids a dead zone when reversing at either limit. */
export function pinchPizzaZoom(current: number, previousDistance: number, distance: number): number {
  if (previousDistance < 1 || !Number.isFinite(distance) || distance < 0) return current
  return Math.max(PIZZA_ZOOM_MIN, Math.min(PIZZA_ZOOM_MAX, current * distance / previousDistance))
}
