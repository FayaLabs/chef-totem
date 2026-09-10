import { motion, useReducedMotion } from 'motion/react'
import { burgerShadowPose, type BurgerLayer, type BurgerLayerPose } from './pilot'

/** The contact plane follows the lowest visible layer, including bread swaps.
 * Percentage geometry keeps the photo, live preview and thumbnails identical. */
export function BurgerShadow({ layers, poses, dimensions, open = false }: {
  layers: BurgerLayer[]; poses: BurgerLayerPose[]
  dimensions: Record<string, { width: number; height: number }>; open?: boolean
}) {
  const reduced = useReducedMotion()
  const pose = burgerShadowPose(layers, poses, dimensions, open)
  if (!pose) return null
  return <motion.span className="burger-contact-shadow" aria-hidden="true" data-testid="burger-shadow"
    initial={false} animate={{ left: `${pose.left}%`, top: `${pose.top}%`,
      width: `${pose.width}%`, height: `${pose.height}%`, opacity: pose.opacity }}
    transition={{ duration: reduced ? 0 : .65, ease: [.22, 1, .36, 1] }} />
}
