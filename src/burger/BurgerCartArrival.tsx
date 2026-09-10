import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { BurgerVisual } from './BurgerVisual'
import { burgerDimensions } from './BurgerStill'
import type { BurgerLayer } from './pilot'

const EVENT = 'totem:burger-arrival'
type Rect = { x: number; y: number; width: number; height: number }
interface Arrival { seq: number; layers: BurgerLayer[]; source: Rect; target: Rect; open: boolean }

/** Called only after a successful, synchronous cart commit. No animation callback
 * can add a product, change its price or delay recording the customer's choice. */
export function showBurgerArrival(arrival: Arrival) {
  window.dispatchEvent(new CustomEvent<Arrival>(EVENT, { detail: arrival }))
}

export function BurgerCartArrival() {
  const [arrival, setArrival] = useState<Arrival | null>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const receive = (event: Event) => setArrival((event as CustomEvent<Arrival>).detail)
    window.addEventListener(EVENT, receive)
    return () => window.removeEventListener(EVENT, receive)
  }, [])
  return arrival && !reduced ? createPortal(<ArrivalVisual key={arrival.seq} arrival={arrival}
    onComplete={() => setArrival((current) => current?.seq === arrival.seq ? null : current)} />, document.body) : null
}

function ArrivalVisual({ arrival, onComplete }: { arrival: Arrival; onComplete: () => void }) {
  const [open, setOpen] = useState(arrival.open)
  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 30)
    return () => clearTimeout(timer)
  }, [])
  const { source, target } = arrival
  const x = target.x + target.width / 2 - source.width / 2
  const y = target.y + target.height / 2 - source.height / 2
  return <motion.div className="burger-cart-arrival" aria-hidden="true" data-testid="burger-cart-arrival" data-closing={!open}
    style={{ width: source.width, height: source.height }}
    initial={{ x: source.x, y: source.y, scale: 1, opacity: 1 }}
    animate={{ x: [source.x, source.x, x], y: [source.y, source.y, y], scale: [1, 1, .12], opacity: [1, 1, 0] }}
    transition={{ duration: arrival.open ? 1.3 : .8, times: [0, arrival.open ? .54 : .16, 1], ease: [.4, 0, .2, 1] }}
    onAnimationComplete={onComplete}>
    <BurgerVisual layers={arrival.layers} dimensions={burgerDimensions} open={open} />
  </motion.div>
}
