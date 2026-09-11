import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { PointerEvent } from 'react'
import { BURGER_ASSETS, burgerPoses, type BurgerLayer } from './pilot'
import { BurgerShadow } from './BurgerShadow'
import './burger.css'

export function BurgerVisual({ layers, dimensions, open = false, ambient = false, selectedId, hiddenId, onSelect, onLayerPointerDown, onImageError }: {
  layers: BurgerLayer[]; dimensions: Record<string, { width: number; height: number }>; open?: boolean; ambient?: boolean
  selectedId?: string | null; hiddenId?: string | null; onSelect?: (id: string, keyboard?: boolean) => void
  onLayerPointerDown?: (event: PointerEvent<HTMLButtonElement>, layer: BurgerLayer) => void
  onImageError?: () => void
}) {
  const reduced = Boolean(useReducedMotion())
  const poses = burgerPoses(layers, dimensions, open)
  return <div className={`burger-visual ${ambient && !reduced ? 'burger-ambient' : ''}`} role={onSelect && open ? 'group' : 'img'}
    aria-label={`Burger ${open ? 'em camadas' : 'montado'}: ${[...new Set(layers.map((l) => l.label))].join(', ')}`} data-testid="burger-visual">
    <BurgerShadow layers={layers} poses={poses} dimensions={dimensions} open={open} />
    <AnimatePresence initial={false}>
      {layers.map((layer, index) => {
        const pose = poses[index]
        return <motion.div key={layer.id} className="burger-layer-frame" data-testid={`burger-layer-${layer.id}`} data-asset={layer.asset}
          data-group={pose.group} data-center-y={pose.centerY} data-width={pose.width} style={{ zIndex: index + 1 }}
          initial={reduced ? false : { opacity: 0, x: `${pose.centerX - 44}%`, y: `${pose.centerY - 68}%`, scale: pose.width / 100 * .85 }}
          animate={{ opacity: 1, x: `${pose.centerX - 50}%`, y: `${pose.centerY - 50}%`, scale: pose.width / 100 }}
          exit={{ opacity: 0, x: '8%' }} transition={{ duration: reduced ? 0 : .65, ease: [.22, 1, .36, 1] }}>
          {/* Cada camada entra no ciclo num ponto diferente e com uma duração
              diferente: em fase, a pilha inteira sobe junta e o olho lê parado. */}
          <div className="burger-layer-float" style={{
            animationDelay: `${-(pose.group * .5 + index * .37)}s`,
            animationDuration: `${4.2 + (index % 3) * .7}s`,
            opacity: hiddenId === layer.id ? .2 : 1,
          }}>
            {onSelect && open ? <button type="button" className="burger-layer-hit" data-testid={`burger-hit-${layer.id}`}
              aria-label={`Selecionar ${layer.label}`} aria-pressed={selectedId === layer.id}
              style={{ aspectRatio: dimensions[layer.asset] ? `${dimensions[layer.asset].width} / ${dimensions[layer.asset].height}` : '1 / .6' }}
              onClick={(event) => onSelect(layer.id, event.detail === 0)} onPointerDown={(event) => onLayerPointerDown?.(event, layer)}>
              <img src={`${BURGER_ASSETS}/${layer.asset}.webp`} alt="" draggable={false} decoding="async" onError={onImageError} />
            </button> : <img src={`${BURGER_ASSETS}/${layer.asset}.webp`} alt="" draggable={false} decoding="async" onError={onImageError} />}
          </div>
        </motion.div>
      })}
    </AnimatePresence>
  </div>
}
