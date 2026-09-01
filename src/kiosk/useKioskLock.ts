import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// The panel is an appliance, not a browser.
//
// Everything here removes an escape hatch a customer could fall into by
// accident: a pinch that leaves the layout at 2.3x zoom, a long-press that
// opens "Copy image", a downward swipe at the top that reloads mid-order, a
// screen that sleeps during the lunch rush.
//
// Zoom is blocked by intercepting the gestures, NOT by user-scalable=no in the
// viewport meta — that switch disables the system zoom an actual low-vision
// customer needs, and modern browsers ignore it anyway.
// ---------------------------------------------------------------------------

/** Wake Lock is behind a vendor-shaped API that TS doesn't ship types for. */
interface WakeLockSentinelLike {
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}
interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

export function useKioskLock(): void {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault()

    // Pinch-zoom is multi-touch on Chrome and a gesture event on WebKit; catch
    // both. Double-tap zoom is NOT handled here — `touch-action: manipulation`
    // (styles.css) already disables it, and the obvious JS version (swallow any
    // touchend within 300ms of the last one) also swallows a customer tapping
    // two modifier chips in a row, which reads as a dead panel.
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault()
    }
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault()
    }

    document.addEventListener('contextmenu', prevent)
    document.addEventListener('gesturestart', prevent)
    document.addEventListener('gesturechange', prevent)
    document.addEventListener('touchstart', onTouchStart, { passive: false })
    document.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('gesturestart', prevent)
      document.removeEventListener('gesturechange', prevent)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('wheel', onWheel)
    }
  }, [])

  // Keep the screen awake. The lock dies whenever the tab is backgrounded, so
  // it is re-acquired on every return to visible.
  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await wakeLock.request('screen')
        if (cancelled) void sentinel.release()
      } catch {
        // Denied (no user gesture yet, battery saver). Retried on next visibility.
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release()
    }
  }, [])
}

/** Fullscreen needs a user gesture, so it rides the first touch of the session. */
export function useFullscreenOnFirstTouch(): void {
  useEffect(() => {
    const enter = () => {
      document.removeEventListener('pointerdown', enter)
      if (document.fullscreenElement) return
      void document.documentElement.requestFullscreen?.().catch(() => {
        // Blocked (dev tools focused, permissions policy). Not fatal.
      })
    }
    document.addEventListener('pointerdown', enter)
    return () => document.removeEventListener('pointerdown', enter)
  }, [])
}
