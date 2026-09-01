import { Minus, Plus } from 'lucide-react'

// Quantity. The two controls are `--tap-lg` because this is the single most
// repeatedly tapped thing on the panel, and the count between them is tabular
// so the buttons do not shuffle sideways going from 9 to 10.
export interface StepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  'data-testid'?: string
}

export function Stepper({ value, onChange, min = 1, max = 99, ...rest }: StepperProps) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)))

  return (
    <div className="flex items-center gap-[3cqw]" data-testid={rest['data-testid']}>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        data-testid="stepper-minus"
        disabled={value <= min}
        onClick={() => step(-1)}
        className="press grid size-[var(--tap-lg)] place-items-center rounded-full border-2 border-edge bg-white disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg"
      >
        <Minus strokeWidth={3} className="size-[3cqw]" />
      </button>

      <span
        className="tnum min-w-[6cqw] text-center font-bold"
        style={{ fontSize: 'var(--step-title)' }}
        aria-live="polite"
        data-testid="stepper-value"
      >
        {value}
      </span>

      <button
        type="button"
        aria-label="Aumentar quantidade"
        data-testid="stepper-plus"
        disabled={value >= max}
        onClick={() => step(1)}
        className="press grid size-[var(--tap-lg)] place-items-center rounded-full bg-ink text-white disabled:bg-disabled-bg disabled:text-disabled-fg"
      >
        <Plus strokeWidth={3} className="size-[3cqw]" />
      </button>
    </div>
  )
}
