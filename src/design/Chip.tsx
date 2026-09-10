import type { ButtonHTMLAttributes, ReactNode } from 'react'

// A selectable pill: menu filters and modifier options.
//
// Selection is filled dark, never a coloured outline — under dining-room glare
// an outline reads as "disabled" about as often as it reads as "chosen".
//
// O NÃO-SELECIONADO é vidro: uma pane com a tonalidade da casa e a quina de
// luz. A borda de 2px que ele tinha desenhava uma moldura preta em volta de
// cada opção, e uma tela com sete molduras compete com o texto que está dentro
// delas. O vidro separa a opção do fundo sem desenhar nada.
//
// SEM DESFOQUE, e isto é uma correção e não uma economia. O chip morava num
// `backdrop-blur-xl` sobre a PÁGINA, que é uma cor chapada — desfocar uma cor
// chapada devolve a mesma cor, então o filtro pintava exatamente o que já
// estava lá e cobrava uma camada de composição por chip. Num grupo de sete
// modificadores dentro de um sheet que rola eram sete camadas para um efeito de
// zero pixel de diferença. A cor agora vem composta do tema (`--glass-pane`).
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
          ? 'sheen bg-ink text-white shadow-[0_0.3cqw_0.9cqw_rgba(11,11,12,0.22)]'
          : 'glass text-ink active:brightness-[0.94]',
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:shadow-none disabled:[&::after]:hidden',
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
