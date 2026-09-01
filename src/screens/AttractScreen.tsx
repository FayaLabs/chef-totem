import { MediaBackdrop } from '@/design'
import { totemConfig } from '@/config/totem.config'
import { useTotemSession } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// The resting state, and the only screen most passers-by ever see.
//
// The whole panel is the button. Nobody walking past a kiosk hunts for a target
// — they touch the screen. A "start" button that only works in one rectangle
// teaches the customer that the panel is broken.
// ---------------------------------------------------------------------------

export function AttractScreen() {
  const start = useTotemSession((s) => s.start)
  const { brand, media } = totemConfig

  return (
    <button
      type="button"
      data-testid="attract"
      onClick={start}
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
    >
      <MediaBackdrop videoSrc={media.videoUrl} posterSrc={media.posterUrl} scrim={55} />

      <span
        className="relative z-10 font-display uppercase leading-[0.85] tracking-tight"
        style={{ fontSize: 'var(--step-hero)' }}
      >
        {brand.name}
      </span>
      <span
        className="relative z-10 mt-[2cqw] uppercase tracking-[0.4em] text-white/75"
        style={{ fontSize: 'var(--step-label)' }}
      >
        {brand.tagline}
      </span>

      {/* Pinned low: this is where a hand already is, and where the eye lands
          after the brand. The pulse is the only motion on the screen. */}
      <span
        className="absolute inset-x-0 z-10 flex justify-center"
        style={{ bottom: '14cqw' }}
      >
        <span
          className="rounded-full bg-action px-[7cqw] uppercase tracking-[0.2em] motion-safe:animate-[attract-pulse_2.4s_ease-in-out_infinite] grid place-items-center"
          style={{ fontSize: 'var(--step-body)', minHeight: 'var(--tap-bar)' }}
        >
          Toque para começar
        </span>
      </span>
    </button>
  )
}
