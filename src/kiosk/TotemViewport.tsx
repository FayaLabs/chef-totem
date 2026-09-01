import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// The 9:16 stage.
//
// The panel is 1080x1920, but a dev laptop is not, and the next store's panel
// may not be either. Rather than hardcode pixels, the app renders into a box
// that keeps 9:16 and centres itself — so a screenshot at 1080x1920 and a
// glance on a 16:10 laptop show the same composition, and every `vw`-based
// token stays proportional because they resolve against this box, not the
// window.
// ---------------------------------------------------------------------------

export function TotemViewport({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <div
        data-totem-stage
        className="relative overflow-hidden bg-ink"
        style={{
          aspectRatio: '9 / 16',
          height: 'min(100dvh, calc(100dvw * 16 / 9))',
          width: 'min(100dvw, calc(100dvh * 9 / 16))',
          // Everything inside sizes against the stage, so `cqw` units track the
          // panel width rather than the browser window.
          containerType: 'size',
        }}
      >
        {children}
      </div>
    </div>
  )
}
