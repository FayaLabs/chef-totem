import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export const BURGER_REVEAL_MS = 2600
export const BURGER_CLOSE_MS = 650

/** One interruptible timeline: a new choice replaces the pending close. */
export function useBurgerReveal(signature: string, failed: boolean) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'photo' | 'layers'>('photo')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const previous = useRef(signature)
  const clear = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = [] }, [])
  const close = useCallback(() => {
    clear(); setOpen(false)
    timers.current.push(setTimeout(() => setView('photo'), BURGER_CLOSE_MS))
  }, [clear])
  const scheduleClose = useCallback(() => {
    clear(); timers.current.push(setTimeout(close, BURGER_REVEAL_MS))
  }, [clear, close])
  const reveal = useCallback(() => {
    if (failed) return
    setView('layers'); setOpen(true); scheduleClose()
  }, [failed, scheduleClose])
  useLayoutEffect(() => {
    if (previous.current === signature) return
    previous.current = signature
    reveal()
  }, [signature, reveal])
  useEffect(() => {
    if (failed) { clear(); setOpen(false); setView('photo') }
  }, [failed, clear])
  useEffect(() => clear, [clear])
  return { open, view, reveal, close, pause: clear, resume: () => { if (open) scheduleClose() } }
}
