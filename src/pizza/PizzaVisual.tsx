import { AnimatePresence, motion } from 'motion/react'
import type { PizzaComposition } from './types'

/** Shared by the physical scene and the cart: identical masks, identical flavors. */
export function PizzaVisual({ pizza, animate = false, emptyHalf = false, emptyFirst = false }: {
  pizza: PizzaComposition; animate?: boolean; emptyHalf?: boolean; emptyFirst?: boolean
}) {
  const split = pizza.mode === 'half' || emptyHalf
  return (
    <div className="pizza-visual" role="img" aria-label={emptyFirst
      ? pizza.second ? `Metade ${pizza.second.name}; escolha o primeiro sabor` : 'Pizza vazia: escolha seu primeiro sabor'
      : pizza.second
      ? `Pizza: metade ${pizza.first.name}, metade ${pizza.second.name}`
      : emptyHalf ? `Metade ${pizza.first.name}; escolha o segundo sabor` : `Pizza ${pizza.first.name}`}>
      <div className="pizza-flavor" style={{ clipPath: split ? 'inset(0 50% 0 0)' : undefined }}>
        <AnimatePresence initial={false}>
          {!emptyFirst && <motion.img key={pizza.first.imageUrl} src={pizza.first.imageUrl} draggable={false} alt=""
            initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: animate ? 0.28 : 0 }} />}
        </AnimatePresence>
      </div>
      {split && <div className={`pizza-flavor pizza-flavor-second ${!pizza.second ? 'pizza-flavor-empty' : ''}`} style={{ clipPath: 'inset(0 0 0 50%)' }}>
        <AnimatePresence initial={false}>
          {pizza.second && <motion.img key={pizza.second.imageUrl} src={pizza.second.imageUrl} draggable={false} alt=""
            initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: animate ? 0.28 : 0 }} />}
        </AnimatePresence>
      </div>}
    </div>
  )
}
