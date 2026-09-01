import { useTotemSession } from '@/session/useTotemSession'

// The resting state. Full-bleed tenant media lands in M2; for now the stage
// paints the brand surface so the viewport and the kiosk lock are visible.
export function AttractScreen() {
  const start = useTotemSession((s) => s.start)

  return (
    <button
      type="button"
      data-testid="attract"
      onClick={start}
      className="press absolute inset-0 flex flex-col items-center justify-end bg-ink text-white"
      style={{ paddingBottom: '18cqw' }}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <span
          className="font-display uppercase leading-[0.85] tracking-tight"
          style={{ fontSize: 'var(--step-hero)' }}
        >
          Chef
        </span>
        <span
          className="mt-[2cqw] uppercase tracking-[0.4em] text-white/60"
          style={{ fontSize: 'var(--step-label)' }}
        >
          Feito na hora para você
        </span>
      </div>

      <span
        className="rounded-full bg-action px-[6cqw] uppercase tracking-[0.2em] text-white grid place-items-center"
        style={{ fontSize: 'var(--step-body)', height: 'var(--tap-bar, 120px)', minHeight: '120px' }}
      >
        Toque para começar
      </span>
    </button>
  )
}
