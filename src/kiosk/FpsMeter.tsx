import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Frames per second, on the glass.
//
// A panel that stutters does it in the room, not on a developer's laptop: the
// attract video, the menu's images and the assistant's orb all compete for the
// same GPU that a mini-PC under a counter barely has. The number has to be
// readable from in front of the totem, for the same reason the build label is.
//
// `VITE_TOTEM_FPS=off` removes it — the day a customer would be the one reading
// it, it should not be there.
// ---------------------------------------------------------------------------

/** Frames sampled before the average is worth showing. */
const WINDOW_MS = 500

export function FpsMeter() {
  const [fps, setFps] = useState<number | null>(null)
  // Only the shell can answer this: no web API exposes the adapter's load, so
  // the main process reads the Windows counters and pushes the number in.
  const [gpu, setGpu] = useState<number | null>(null)
  const frame = useRef(0)

  useEffect(() => window.fayzShell?.onGpuUsage?.(setGpu), [])

  useEffect(() => {
    let frames = 0
    let since = performance.now()
    const tick = (now: number) => {
      frames += 1
      const elapsed = now - since
      if (elapsed >= WINDOW_MS) {
        setFps(Math.round((frames * 1000) / elapsed))
        frames = 0
        since = now
      }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [])

  if (fps === null) return null

  // Green is the panel keeping up, amber is visible stutter, red is a customer
  // watching the menu lag while they tap.
  const tone = fps >= 50 ? '#4ade80' : fps >= 30 ? '#fbbf24' : '#f87171'

  return (
    <div
      data-testid="fps-meter"
      aria-hidden
      style={{
        position: 'fixed',
        top: 6,
        left: 6,
        zIndex: 2147483646,
        // Below the exit hatch's corner, and transparent to it: the five taps
        // that open the maintenance keypad land in exactly this square, and a
        // meter that swallowed them would seal the panel shut.
        pointerEvents: 'none',
        font: '600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
        color: tone,
        background: 'rgba(0,0,0,.55)',
        padding: '4px 6px',
        borderRadius: 4,
        letterSpacing: '0.02em',
      }}
    >
      <div>{fps} fps</div>
      {gpu === null ? null : (
        // Amber from 70%: a panel that sits there has nothing left for the next
        // effect, even while the frame rate still looks fine.
        <div style={{ marginTop: 3, color: gpu >= 90 ? '#f87171' : gpu >= 70 ? '#fbbf24' : '#9ca3af' }}>
          gpu {gpu}%
        </div>
      )}
    </div>
  )
}
