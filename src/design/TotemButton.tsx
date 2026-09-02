import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ---------------------------------------------------------------------------
// The only button on the panel.
//
// Three sizes, and all three are floors rather than fixed heights: text that
// wraps grows the button instead of being clipped. `base` is the 88px kiosk
// minimum, `lg` is for anything a customer taps repeatedly (steppers, keypad),
// `bar` is the full-width commit at the bottom of the screen.
// ---------------------------------------------------------------------------

type Tone = 'action' | 'ink' | 'ghost' | 'quiet' | 'bar-quiet'
type Size = 'base' | 'lg' | 'bar'

const TONES: Record<Tone, string> = {
  // Red is the commit. Only one per screen — see DESIGN.md.
  // O commit é o único tom OPACO do sistema: o vidro é para o que sustenta a
  // tela, não para o que cobra o cliente. Uma cor sólida é o que diz "aqui
  // acaba a navegação e começa a consequência".
  action: 'bg-action text-white shadow-[0_0.3cqw_1cqw_rgba(220,38,38,0.30)]',
  ink: 'bg-ink text-white shadow-[0_0.3cqw_0.9cqw_rgba(11,11,12,0.22)]',
  // On dark media. A 2px border, never 1px: hairlines vanish under glare.
  ghost: 'border-2 border-white/70 bg-white/10 text-white backdrop-blur-md',
  // The out. Same height as its sibling so "skip" never reads as second-class.
  quiet:
    'bg-white/60 text-ink backdrop-blur-xl shadow-[inset_0_0.14cqw_0_rgba(255,255,255,0.9),0_0.2cqw_0.6cqw_rgba(11,11,12,0.09)] active:bg-white/90',
  // The neutral half of a split bottom bar. No border: inside a full-bleed bar
  // a bordered pill reads as a mistake, and the stray edge made the two halves
  // 2px different, which is exactly the kind of "same weight" that is not.
  'bar-quiet': 'bg-page text-ink',
}

const SIZES: Record<Size, string> = {
  base: 'min-h-[var(--tap)] px-[4cqw] rounded-totem',
  lg: 'min-h-[var(--tap-lg)] px-[5cqw] rounded-totem',
  bar: 'min-h-[var(--tap-bar)] px-[6cqw] rounded-none w-full',
}

export interface TotemButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  size?: Size
  children: ReactNode
}

export function TotemButton({
  tone = 'action',
  size = 'base',
  className = '',
  children,
  ...rest
}: TotemButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={[
        'press inline-flex items-center justify-center gap-[2cqw]',
        'font-semibold uppercase tracking-[0.16em]',
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:border-transparent disabled:shadow-none',
        TONES[tone],
        SIZES[size],
        className,
      ].join(' ')}
      style={{ fontSize: 'var(--step-body)', ...rest.style }}
    >
      {children}
    </button>
  )
}
