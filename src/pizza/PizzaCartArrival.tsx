import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCart, type CartFlash } from '@/cart/useCart'
import { PizzaVisual } from './PizzaVisual'
import './pizza.css'

/** A visual hand-off to the existing cart. Animation never submits or blocks a tap. */
export function PizzaCartArrival() {
  const lastAdded = useCart((s) => s.lastAdded)
  const seen = useRef(lastAdded?.seq)
  const [arrival, setArrival] = useState<CartFlash | null>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (seen.current === lastAdded?.seq) return
    seen.current = lastAdded?.seq
    if (!lastAdded?.pizza || reduced) return
    setArrival(lastAdded)
    const timer = setTimeout(() => setArrival(null), 700)
    return () => clearTimeout(timer)
  }, [lastAdded, reduced])
  return <AnimatePresence>{arrival?.pizza && !reduced && <motion.div key={arrival.seq} className="pizza-arrival" aria-hidden="true"
    initial={{ opacity: 0, scale: .9, y: '-50%' }}
    animate={{ opacity: [0, 1, 1, 0], scale: [.9, 1, .25, .2], x: [0, 0, '-23cqw', '-23cqw'], y: ['-50%', '-50%', '54cqw', '54cqw'] }}
    transition={{ duration: .65, times: [0, .15, .9, 1], ease: [.4, 0, .2, 1] }}><PizzaVisual pizza={arrival.pizza} /></motion.div>}</AnimatePresence>
}
