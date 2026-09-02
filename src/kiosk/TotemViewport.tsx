import type { ReactNode } from 'react'
import { REACH_INSET_RATIO, useReachMode } from '@/design/useReachMode'

// ---------------------------------------------------------------------------
// The 9:16 stage.
//
// The panel is 1080x1920, but a dev laptop is not, and the next store's panel
// may not be either. Rather than hardcode pixels, the app renders into a box
// that keeps 9:16 and centres itself — so a 1080x1920 screenshot and a glance
// on a 16:10 laptop show the same composition, and every `cqw` token stays
// proportional because it resolves against this box, not the window.
//
// Reach mode surrenders the top of the stage rather than scaling the UI down:
// the content area shrinks and scrolls, and every tap target keeps its physical
// size. Shrinking would make the panel harder to hit for the exact person who
// asked for help reaching it.
// ---------------------------------------------------------------------------

export function TotemViewport({ children }: { children: ReactNode }) {
  const reach = useReachMode((s) => s.enabled)

  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <div
        data-totem-stage
        data-reach={reach ? 'on' : 'off'}
        className="relative overflow-hidden bg-ink"
        style={{
          aspectRatio: '9 / 16',
          height: 'min(100dvh, calc(100dvw * 16 / 9))',
          width: 'min(100dvw, calc(100dvh * 9 / 16))',
          containerType: 'size',
        }}
      >
        <div
          data-totem-content
          className="absolute inset-x-0 bottom-0 overflow-hidden transition-[top] duration-300 ease-out"
          style={{ top: reach ? `${REACH_INSET_RATIO * 100}%` : '0' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
