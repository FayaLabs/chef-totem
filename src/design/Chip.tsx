import type { ButtonHTMLAttributes, ReactNode } from 'react'

// A selectable pill: menu filters and modifier options.
//
// Selection is filled dark, never a coloured outline — under dining-room glare
// an outline reads as "disabled" about as often as it reads as "chosen".
//
// O NÃO-SELECIONADO é vidro: translúcido, desfocado, com uma linha de luz no
// topo. A borda de 2px que ele tinha desenhava uma moldura preta em volta de
// cada opção, e uma tela com sete molduras compete com o texto que está dentro
// delas. O vidro separa a opção do fundo sem desenhar nada.
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
        selected
          ? 'bg-ink text-white shadow-[0_0.3cqw_0.9cqw_rgba(11,11,12,0.22)]'
          : 'bg-white/60 text-ink backdrop-blur-xl shadow-[inset_0_0.14cqw_0_rgba(255,255,255,0.9),0_0.2cqw_0.6cqw_rgba(11,11,12,0.09)] active:bg-white/90',
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:shadow-none',
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
