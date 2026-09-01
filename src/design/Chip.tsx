import type { ButtonHTMLAttributes, ReactNode } from 'react'

// A selectable pill: menu filters and modifier options.
//
// Selection is filled dark, never a coloured outline — under dining-room glare
// an outline reads as "disabled" about as often as it reads as "chosen".
//
// `compact` stacks the surcharge UNDER the name instead of beside it, which is
// what lets three options share a row. Side by side, a long name plus "+ R$
// 9,00" forced two-per-row and turned a five-option group into a scroll.
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  /** Extra price this option adds, in cents. Shown so nothing is a surprise. */
  surchargeCents?: number
  compact?: boolean
  children: ReactNode
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function Chip({
  selected = false,
  surchargeCents,
  compact = false,
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
        'press flex min-h-[var(--tap)] rounded-totem text-left uppercase',
        compact
          ? 'flex-col items-start justify-center gap-[0.4cqw] px-[2.2cqw] py-[1.5cqw] tracking-[0.06em]'
          : 'items-center justify-between gap-[2cqw] px-[3cqw] tracking-[0.12em]',
        selected ? 'bg-ink text-white' : 'bg-white text-ink border-2 border-edge',
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:border-transparent',
        className,
      ].join(' ')}
      style={{ fontSize: 'var(--step-label)', ...rest.style }}
    >
      <span className={compact ? 'font-semibold leading-tight' : 'font-semibold'}>{children}</span>
      {surchargeCents ? (
        <span className={['tnum shrink-0', selected ? 'text-white/70' : 'text-muted'].join(' ')}>
          + {brl.format(surchargeCents / 100)}
        </span>
      ) : null}
    </button>
  )
}
