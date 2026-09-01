import type { ButtonHTMLAttributes, ReactNode } from 'react'

// A selectable pill: menu filters and modifier options. Selection is filled
// dark, never a coloured outline — under dining-room glare an outline reads as
// "disabled" about as often as it reads as "chosen".
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  /** Extra price this option adds, in cents. Shown so nothing is a surprise. */
  surchargeCents?: number
  children: ReactNode
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function Chip({
  selected = false,
  surchargeCents,
  className = '',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={[
        'press flex min-h-[var(--tap)] items-center justify-between gap-[2cqw]',
        'rounded-totem px-[3cqw] text-left uppercase tracking-[0.12em]',
        selected ? 'bg-ink text-white' : 'bg-white text-ink border-2 border-edge',
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:border-transparent',
        className,
      ].join(' ')}
      style={{ fontSize: 'var(--step-label)', ...rest.style }}
    >
      <span className="font-semibold">{children}</span>
      {surchargeCents ? (
        <span className={['tnum shrink-0', selected ? 'text-white/70' : 'text-muted'].join(' ')}>
          + {brl.format(surchargeCents / 100)}
        </span>
      ) : null}
    </button>
  )
}
