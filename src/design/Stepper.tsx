import { Minus, Plus } from 'lucide-react'

// ---------------------------------------------------------------------------
// Quantity.
//
// TWO sizes, because the same control has two jobs. In a product sheet it is
// the hero of the screen and gets `--tap-lg`. In a cart ROW it is one of five
// things competing for a 1080px line — at 104px it swallowed the row and
// squeezed "CHOPP ARTESANAL 500ML" into three clipped lines.
//
// `sm` is still 88px: the kiosk floor is a floor, not a suggestion.
// ---------------------------------------------------------------------------

export interface StepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'lg'
  'data-testid'?: string
}

export function Stepper({ value, onChange, min = 1, max = 99, size = 'lg', ...rest }: StepperProps) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)))

  const box = size === 'lg' ? 'size-[var(--tap-lg)]' : 'size-[var(--tap)]'
  const icon = size === 'lg' ? 'size-[3cqw]' : 'size-[2.4cqw]'
  const gap = size === 'lg' ? 'gap-[3cqw]' : 'gap-[1.5cqw]'
  const count = size === 'lg' ? 'var(--step-title)' : 'var(--step-body)'
  const width = size === 'lg' ? 'min-w-[6cqw]' : 'min-w-[3.5cqw]'

  return (
    <div className={`flex items-center ${gap}`} data-testid={rest['data-testid']}>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        data-testid="stepper-minus"
        disabled={value <= min}
        onClick={() => step(-1)}
        className={`press grid ${box} shrink-0 place-items-center rounded-full border-2 border-edge bg-white disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg`}
      >
        <Minus strokeWidth={3} className={icon} />
      </button>

      <span
        className={`tnum ${width} text-center font-bold`}
        style={{ fontSize: count }}
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
        className={`press grid ${box} shrink-0 place-items-center rounded-full bg-ink text-white disabled:bg-disabled-bg disabled:text-disabled-fg`}
      >
        <Plus strokeWidth={3} className={icon} />
      </button>
    </div>
  )
}
