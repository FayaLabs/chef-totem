import { motion, useTransform } from 'motion/react'
import { usePizzaRotation } from './usePizzaRotation'
import { PizzaVisual } from './PizzaVisual'
import { PIZZA_ASSETS, pizzaPreviewScale } from './composition'
import type { PizzaComposition } from './types'

export function PizzaStage({ pizza, emptyFirst = false, emptyHalf, activeHalf, onHalfSelect, reduced, diameterCm }: {
  pizza: PizzaComposition; emptyHalf: boolean; activeHalf: 0 | 1; onHalfSelect: (half: 0 | 1) => void
  reduced: boolean
  diameterCm?: number
  emptyFirst?: boolean
}) {
  const spin = usePizzaRotation({ paused: false, reduced, suspended: false, editing: false, sizeKey: diameterCm,
    interactionKey: `${pizza.first.productId}:${pizza.second?.productId}:${activeHalf}:${pizza.mode}:${emptyFirst}`,
    onTap: pizza.mode === 'half' ? onHalfSelect : undefined })
  const upright = useTransform(spin.rotation, (angle) => -angle)
  const scale = pizzaPreviewScale(diameterCm)
  return (
    <section className={`pizza-stage ${reduced ? 'pizza-effects-paused' : ''}`}
      data-testid="pizza-stage" data-diameter={diameterCm ?? 'preview'} aria-label={diameterCm ? `Sua pizza de ${diameterCm} centímetros` : 'Sua pizza na bancada'}>
      <motion.div className="pizza-board-flight" initial={reduced ? false : { opacity: 0, scale: .92 }}
        animate={{ opacity: 1, scale: scale.scene }} transition={{ duration: reduced ? 0 : .6, ease: [.16, 1, .3, 1] }} data-testid="pizza-size-scene">
        <motion.div ref={spin.surface} className="pizza-touch-surface" {...spin.handlers} style={{ scale: spin.zoom }} data-testid="pizza-spin"
          data-rotation-state={spin.phase} aria-label="Toque em uma metade para editar. Arraste para girar ou use dois dedos para aproximar a pizza." role="group">
          <motion.div className="pizza-board" style={{ rotate: spin.rotation }} data-testid="pizza-board">
            <img className="pizza-wood" src={`${PIZZA_ASSETS}/board.webp`} alt="" draggable={false} />
            <motion.div className="pizza-on-board" data-testid="pizza-size-food" initial={false} animate={{ scale: scale.food }}
              transition={{ duration: reduced ? 0 : .6, ease: [.16, 1, .3, 1] }}>
              <PizzaVisual pizza={pizza} animate={!reduced} emptyFirst={emptyFirst} emptyHalf={emptyHalf} />
              {pizza.mode === 'half' && <>
              <div className="pizza-half-tint" data-testid="pizza-half-highlight" data-half={activeHalf}
                style={{ clipPath: activeHalf === 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }} aria-hidden="true" />
              <div className="pizza-half-divider" aria-hidden="true" />
              </>}
            </motion.div>
            {pizza.mode === 'half' && <>
              {([0, 1] as const).map((half) => <motion.span key={half} style={{ rotate: upright }}
                className={`pizza-half-marker pizza-half-marker-${half} ${activeHalf === half ? 'is-active' : ''}`} aria-hidden="true">{half + 1}</motion.span>)}
            </>}
          </motion.div>
        </motion.div>
      </motion.div>
      {!reduced && <div className="pizza-steam" aria-hidden="true"><i /><i /><i /></div>}
    </section>
  )
}
