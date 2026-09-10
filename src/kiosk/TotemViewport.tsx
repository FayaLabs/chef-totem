import type { ReactNode } from 'react'
import { TOTEM_RELEASE } from '@/config/totem.config'
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

        {/* Which build is on the glass, on every screen.
            It sits on the STAGE rather than inside the content box on purpose:
            content shifts down in reach mode, and a support label that moves
            with it would land in the middle of the screen.
            Top corner, because the bottom belongs to the waiter dock and the
            action bars. `pointer-events-none` so it can never eat a tap.
            The chip is what makes it legible on both an attract poster and a
            near-white form — a fixed colour is invisible on one or the other. */}
        <span
          data-testid="totem-release"
          aria-hidden="true"
          className="pointer-events-none absolute right-[2cqw] top-[1.5cqw] z-50 select-none rounded-full bg-black/25 px-[1.5cqw] py-[0.5cqw] uppercase tracking-[0.2em] text-white/70"
          style={{ fontSize: 'var(--step-label)' }}
        >
          {TOTEM_RELEASE}
        </span>
      </div>
    </div>
  )
}
