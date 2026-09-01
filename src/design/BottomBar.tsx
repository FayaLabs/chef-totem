import type { ReactNode } from 'react'
import { ReachModeToggle } from '@/design/ReachModeToggle'

// ---------------------------------------------------------------------------
// The persistent bottom edge: reach toggle on the left, the screen's own
// commit on the right.
//
// This exists because the reach toggle used to float over the content. On a
// panel whose middle scrolls, a floating control ALWAYS ends up on top of
// something — and a button hidden under another button is the worst kind of
// broken, because nothing about it looks wrong. Giving it a reserved slot in
// real chrome removes the whole class of collision.
// ---------------------------------------------------------------------------

export function BottomBar({ children }: { children?: ReactNode }) {
  return (
    <div
      data-testid="bottom-bar"
      className="absolute inset-x-0 bottom-0 z-30 flex items-stretch border-t-2 border-edge bg-white"
      style={{ minHeight: 'var(--tap-bar)' }}
    >
      <div className="grid shrink-0 place-items-center px-[3cqw]">
        <ReachModeToggle />
      </div>
      <div className="flex min-w-0 flex-1 items-stretch">{children}</div>
    </div>
  )
}
