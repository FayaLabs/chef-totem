import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { animate, useAnimationFrame, useMotionValue } from 'motion/react'
import { angularDelta } from './composition'
import { pinchPizzaZoom, PIZZA_ZOOM_IDLE_MS } from './zoom'

type Phase = 'resting' | 'dragging' | 'pinching' | 'coasting' | 'idle'
const MAX_SPEED = 100

/** One pointer lifecycle for tapping, rotating and pinching; independent size/zoom scales. */
export function usePizzaRotation({ reduced, paused, suspended, editing, interactionKey, sizeKey, onTap }: {
  reduced: boolean; paused: boolean; suspended: boolean; editing: boolean; interactionKey?: string; onTap?: (half: 0 | 1) => void
  sizeKey?: number
}) {
  const rotation = useMotionValue(-12)
  const zoom = useMotionValue(1)
  const zoomTimer = useRef<ReturnType<typeof setTimeout>>()
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const surface = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [touched, setTouched] = useState(false)
  const control = useRef({ pointer: -1, lastAngle: null as number | null, velocity: 8,
    lastMove: 0, lastRelease: -Infinity, slowUntil: 0, direction: 1, phase: 'idle' as Phase, moved: false, startX: 0, startY: 0, pinchDistance: 0 })
  const lastInteraction = useRef(interactionKey)
  const lastSize = useRef(sizeKey)
  const holdZoom = useCallback(() => {
    clearTimeout(zoomTimer.current)
    zoomTimer.current = undefined
    zoom.stop()
  }, [zoom])
  const returnZoom = useCallback(() => {
    holdZoom()
    if (reduced || document.hidden) zoom.set(1)
    else animate(zoom, 1, { duration: .75, ease: [.22, 1, .36, 1] })
  }, [holdZoom, reduced, zoom])
  const scheduleZoomReturn = useCallback(() => {
    holdZoom()
    if (!pointers.current.size && zoom.get() !== 1) zoomTimer.current = setTimeout(returnZoom, PIZZA_ZOOM_IDLE_MS)
  }, [holdZoom, returnZoom, zoom])
  const changePhase = useCallback((next: Phase) => {
    if (control.current.phase === next) return
    control.current.phase = next
    setPhase(next)
  }, [])
  const stop = useCallback(() => {
    const c = control.current
    const captured = [...pointers.current.keys()]
    pointers.current.clear()
    c.pointer = -1
    c.velocity = 0
    c.lastAngle = null
    c.lastRelease = performance.now()
    for (const pointer of captured) {
      if (surface.current?.hasPointerCapture(pointer)) surface.current.releasePointerCapture(pointer)
    }
    changePhase('resting')
    scheduleZoomReturn()
  }, [changePhase, scheduleZoomReturn])

  useEffect(() => {
    if (lastSize.current === sizeKey) return
    lastSize.current = sizeKey
    // Catalog size is the baseline, not another accumulated user zoom.
    returnZoom()
  }, [sizeKey, returnZoom])
  useEffect(() => () => holdZoom(), [holdZoom])
  useEffect(() => {
    if (suspended || paused || reduced) stop()
  }, [suspended, paused, reduced, stop])
  useEffect(() => {
    if (lastInteraction.current === interactionKey) return
    lastInteraction.current = interactionKey
    // A flavor change is not a grab. Preserve both angle and angular speed,
    // easing toward a slower orbit briefly instead of stopping the object.
    const c = control.current
    c.slowUntil = performance.now() + 2600
    scheduleZoomReturn()
    if (c.pointer === -1 && c.phase === 'resting') {
      c.lastRelease = -Infinity
      c.velocity = c.direction * 2
      changePhase('idle')
    }
  }, [interactionKey, changePhase, scheduleZoomReturn])
  useEffect(() => {
    const onVisibility = () => { stop(); returnZoom() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stop, returnZoom])

  useAnimationFrame((_time, delta) => {
    const c = control.current
    if (suspended || paused || reduced || document.hidden || c.pointer !== -1) return
    const dt = Math.min(delta / 1000, 0.04)
    if (c.phase === 'coasting') {
      rotation.set(rotation.get() + c.velocity * dt)
      c.velocity *= Math.exp(-3.6 * dt)
      if (Math.abs(c.velocity) < 1.5) { c.velocity = 0; changePhase('resting') }
    } else if (!editing && performance.now() - c.lastRelease > 4000) {
      changePhase('idle')
      const speed = performance.now() < c.slowUntil ? 2 : 8
      c.velocity += (c.direction * speed - c.velocity) * (1 - Math.exp(-2 * dt))
      rotation.set(rotation.get() + c.velocity * dt)
    }
  })

  const angleAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    return Math.hypot(x, y) < 0.12 ? null : Math.atan2(y, x) * 180 / Math.PI
  }
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (suspended || event.button !== 0 || pointers.current.has(event.pointerId)) return
    holdZoom()
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
    const c = control.current
    if (pointers.current.size > 1) {
      const [a, b] = [...pointers.current.values()]
      c.pinchDistance = Math.hypot(b.x - a.x, b.y - a.y)
      c.moved = true
      c.velocity = 0
      changePhase('pinching')
      return
    }
    c.pointer = event.pointerId
    c.velocity = 0
    c.lastAngle = angleAt(event)
    c.lastMove = performance.now()
    c.moved = false
    c.startX = event.clientX
    c.startY = event.clientY
    changePhase('dragging')
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const c = control.current
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size > 1) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(b.x - a.x, b.y - a.y)
      zoom.set(pinchPizzaZoom(zoom.get(), c.pinchDistance, distance))
      c.pinchDistance = distance
      setTouched(true)
      return
    }
    if (c.pointer !== event.pointerId) return
    const angle = angleAt(event)
    const now = performance.now()
    if (angle !== null && c.lastAngle !== null) {
      const delta = angularDelta(c.lastAngle, angle)
      rotation.set(rotation.get() + delta)
      const instant = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, delta / Math.max(0.008, (now - c.lastMove) / 1000)))
      c.velocity = c.velocity * 0.35 + instant * 0.65
      if (Math.hypot(event.clientX - c.startX, event.clientY - c.startY) > 6) { c.moved = true; setTouched(true) }
    } else { c.velocity = 0 }
    c.lastAngle = angle
    c.lastMove = now
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const c = control.current
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.delete(event.pointerId)
    if (pointers.current.size) {
      // Rebase any remaining fingers. A pinch never turns into a half-selection.
      c.pointer = pointers.current.keys().next().value!
      c.lastAngle = null
      c.velocity = 0
      c.moved = true
      const [a, b] = [...pointers.current.values()]
      c.pinchDistance = b ? Math.hypot(b.x - a.x, b.y - a.y) : 0
      changePhase(b ? 'pinching' : 'dragging')
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    if (c.pointer !== event.pointerId) return
    c.pointer = -1
    c.lastRelease = performance.now()
    if (!c.moved && onTap) {
      const angle = angleAt(event)
      if (angle !== null) onTap(Math.cos((angle - rotation.get()) * Math.PI / 180) < 0 ? 0 : 1)
    }
    if (c.lastRelease - c.lastMove > 90 || !c.moved || reduced || paused) c.velocity = 0
    if (Math.abs(c.velocity) > 1.5) {
      c.direction = Math.sign(c.velocity)
      changePhase('coasting')
    } else changePhase('resting')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    scheduleZoomReturn()
  }
  const onLostPointerCapture = (event: PointerEvent<HTMLDivElement>) => { if (pointers.current.has(event.pointerId)) stop() }
  const nudge = (direction: number) => {
    if (suspended) return
    stop()
    control.current.direction = direction
    rotation.set(rotation.get() + direction * 20)
    setTouched(true)
  }
  return { rotation, zoom, surface, phase, touched, nudge, handlers: {
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel: stop, onLostPointerCapture,
  } }
}
