import { useTotemSession, type TotemStep } from '@/session/useTotemSession'

// Every step after `attract` gets its real screen in M2-M6. Until then this
// renders the step name and a way back, so the state machine is walkable (and
// testable) before any of those screens exist.
export function PlaceholderScreen({ step }: { step: TotemStep }) {
  const reset = useTotemSession((s) => s.reset)
  const ticket = useTotemSession((s) => s.ticket)

  return (
    <div
      data-testid={`screen-${step}`}
      className="absolute inset-0 flex flex-col items-center justify-center gap-[4cqw] bg-page"
    >
      <span
        className="font-display uppercase tracking-tight"
        style={{ fontSize: 'var(--step-display)' }}
      >
        {step}
      </span>
      {ticket ? (
        <span className="tnum uppercase tracking-[0.3em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
          senha {ticket}
        </span>
      ) : null}
      <button
        type="button"
        data-testid="reset"
        onClick={reset}
        className="press rounded-totem bg-ink px-[6cqw] uppercase tracking-[0.2em] text-white"
        style={{ fontSize: 'var(--step-body)', minHeight: '88px' }}
      >
        Recomeçar
      </button>
    </div>
  )
}
