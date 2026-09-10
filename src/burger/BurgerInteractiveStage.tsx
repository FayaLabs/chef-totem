import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue } from 'motion/react'
import { BurgerVisual } from './BurgerVisual'
import { BURGER_ASSETS, type BurgerLayer } from './pilot'
import { LAYER_DRAG_THRESHOLD, layerDragOutcome, visibleBurgerLayers, type LayerDragDirection, type LayerPoint } from './layer-gestures'

type Drag = {
  layer: BurgerLayer; direction: LayerDragDirection; pointerId: number; start: LayerPoint
  offset: LayerPoint; width: number; element: HTMLElement; dragging: boolean; eligible: boolean
}

export function BurgerInteractiveStage({ layers, dimensions, open, removed, onRemove, onRestore, canRemove, onChangeLayer, onImageError, restorableLayers }: {
  layers: BurgerLayer[]; dimensions: Record<string, { width: number; height: number }>; open: boolean
  removed: ReadonlySet<string>; onRemove: (id: string) => void; onRestore: (id: string) => void
  canRemove?: (id: string) => boolean; onChangeLayer?: (id: string) => void; onImageError?: () => void
  restorableLayers?: BurgerLayer[]
}) {
  const scene = useRef<HTMLDivElement>(null)
  const active = useRef<Drag | null>(null)
  const actions = useRef({ onRemove, onRestore })
  actions.current = { onRemove, onRestore }
  const suppressClickUntil = useRef(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [ghost, setGhost] = useState<Drag | null>(null)
  const [eligible, setEligible] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const x = useMotionValue(0), y = useMotionValue(0)
  const visible = visibleBurgerLayers(layers, removed)
  const selectedLayer = visible.find((layer) => layer.id === selected)
  const removedLayers = restorableLayers ?? layers.filter((layer) => removed.has(layer.id))

  useEffect(() => {
    const clear = () => {
      const drag = active.current
      active.current = null
      if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId)
      setGhost(null); setEligible(false)
    }
    const move = (event: PointerEvent) => {
      const drag = active.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const end = { x: event.clientX, y: event.clientY }
      if (!drag.dragging && Math.hypot(end.x - drag.start.x, end.y - drag.start.y) < LAYER_DRAG_THRESHOLD) return
      if (!drag.dragging) { drag.dragging = true; setGhost({ ...drag }) }
      x.set(end.x - drag.offset.x); y.set(end.y - drag.offset.y)
      const bounds = scene.current?.getBoundingClientRect()
      const next = Boolean(bounds && layerDragOutcome(drag.direction, drag.start, end, bounds))
      if (next !== drag.eligible) { drag.eligible = next; setEligible(next) }
    }
    const end = (event: PointerEvent) => {
      const drag = active.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const bounds = scene.current?.getBoundingClientRect()
      const commit = drag.dragging && bounds && layerDragOutcome(drag.direction, drag.start, { x: event.clientX, y: event.clientY }, bounds)
      if (drag.dragging) suppressClickUntil.current = performance.now() + 450
      clear()
      if (commit) {
        if (drag.direction === 'remove') actions.current.onRemove(drag.layer.id)
        else actions.current.onRestore(drag.layer.id)
        setSelected(null)
        setAnnouncement(`${drag.layer.label} ${drag.direction === 'remove' ? 'retirado' : 'recolocado'}.`)
      }
    }
    const cancel = () => {
      if (active.current?.dragging) suppressClickUntil.current = performance.now() + 450
      clear()
    }
    const anotherPointer = (event: PointerEvent) => {
      if (active.current && active.current.pointerId !== event.pointerId) cancel()
    }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('pointerdown', anotherPointer, true)
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', key)
    return () => {
      clear()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('pointerdown', anotherPointer, true)
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [open, x, y])

  // A composition change while a finger is down invalidates that gesture.
  const signature = visible.map((layer) => `${layer.id}:${layer.asset}`).join('|')
  useEffect(() => {
    const drag = active.current
    active.current = null
    if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId)
    setGhost(null); setEligible(false); setSelected(null)
  }, [signature, open])

  function begin(event: ReactPointerEvent<HTMLButtonElement>, layer: BurgerLayer, direction: LayerDragDirection) {
    if (!open || event.button !== 0 || !event.isPrimary || active.current) return
    if (direction === 'remove' && canRemove && !canRemove(layer.id)) return
    const image = event.currentTarget.querySelector('img')
    const bounds = (image ?? event.currentTarget).getBoundingClientRect()
    const width = direction === 'restore' ? Math.min(180, (scene.current?.clientWidth ?? 400) * .4) : bounds.width
    const ratio = dimensions[layer.asset]?.height / dimensions[layer.asset]?.width || .6
    const offset = direction === 'restore' ? { x: width / 2, y: width * ratio / 2 }
      : { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    active.current = { layer, direction, pointerId: event.pointerId, element: event.currentTarget,
      start: { x: event.clientX, y: event.clientY }, offset, width, dragging: false, eligible: false }
    x.set(event.clientX - offset.x); y.set(event.clientY - offset.y)
    event.currentTarget.setPointerCapture(event.pointerId)
    if (direction === 'remove') setSelected(layer.id)
  }

  return <>
    <div className="burger-stage" data-testid="burger-stage" data-open={open} data-dragging={ghost?.direction ?? 'none'} data-drop-ready={eligible}>
      <div className="burger-scene" ref={scene} data-testid="burger-drop-zone">
        <BurgerVisual layers={visible} dimensions={dimensions} open={open} ambient={open && !ghost} onImageError={onImageError}
          selectedId={selected} hiddenId={ghost?.direction === 'remove' ? ghost.layer.id : null}
          onSelect={(id, keyboard) => { if (keyboard || performance.now() > suppressClickUntil.current) setSelected(id) }}
          onLayerPointerDown={(event, layer) => begin(event, layer, 'remove')} />
        {!visible.length && <p className="burger-empty">Sua montagem começa aqui</p>}
      </div>
      {ghost && <div className="burger-drop-message" aria-live="polite">
        {eligible ? (ghost.direction === 'remove' ? 'Solte para retirar' : 'Solte para recolocar') : (ghost.direction === 'remove' ? 'Leve para fora' : 'Leve até o burger')}
      </div>}
      {open && selectedLayer && !ghost && <div className="burger-selection" data-testid="burger-selection">
        <span>{selectedLayer.label}</span>
        <button type="button" data-testid="burger-remove-selected" onClick={() => {
          if (canRemove && !canRemove(selectedLayer.id)) { onChangeLayer?.(selectedLayer.id); setSelected(null); return }
          onRemove(selectedLayer.id); setAnnouncement(`${selectedLayer.label} retirado.`); setSelected(null)
        }}>{canRemove && !canRemove(selectedLayer.id) ? 'Trocar' : 'Retirar'}</button>
      </div>}
    </div>
    {removedLayers.length > 0 && <div className="burger-removed-tray" data-testid="burger-removed-tray">
      <p>Fora do burger</p>
      <div className="burger-removed-items">
        {removedLayers.map((layer) => <button key={layer.id} type="button" className="burger-restore-item"
          data-testid={`burger-restore-${layer.id}`} aria-label={`Recolocar ${layer.label}`}
          onPointerDown={(event) => begin(event, layer, 'restore')}
          onClick={(event) => {
            if (event.detail !== 0 && performance.now() <= suppressClickUntil.current) return
            onRestore(layer.id); setAnnouncement(`${layer.label} recolocado.`)
          }}>
          <img src={`${BURGER_ASSETS}/${layer.asset}.webp`} alt="" draggable={false} />
          <span>{layer.label}</span><span aria-hidden="true">+</span>
        </button>)}
      </div>
    </div>}
    <span className="sr-only" role="status">{announcement}</span>
    {ghost && createPortal(<motion.div className={`burger-drag-ghost ${eligible ? 'is-ready' : ''}`}
      style={{ x, y, width: ghost.width }} aria-hidden="true" data-testid="burger-drag-ghost">
      <img src={`${BURGER_ASSETS}/${ghost.layer.asset}.webp`} alt="" draggable={false} />
    </motion.div>, document.body)}
  </>
}
