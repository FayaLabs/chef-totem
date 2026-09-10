import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { GlassWarp } from '@/design/Glass'

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
  //
  // O commit é o único tom OPACO do sistema, e isso ficou MAIS verdade com o
  // vidro e não menos: quando todo o resto da tela é translúcido, a única peça
  // sólida é a que diz "aqui acaba a navegação e começa a consequência". O
  // vidro é o material do que sustenta a tela; o que cobra o cliente não pode
  // deixar ver nada atrás.
  //
  // Ele ganha só o REALCE — a mesma quina de luz das panes, sem transparência
  // — porque um botão que não pertence ao material da tela lê como um botão
  // colado de outro sistema.
  //
  // A tinta e a sombra vêm do tema, não do arquivo. Fixas em branco e num halo
  // vermelho, elas proibiam metade das marcas: um botão amarelo com texto
  // branco é ilegível, e um botão verde com auréola vermelha parece um erro.
  action: 'sheen bg-action text-on-action shadow-[var(--shadow-action)]',
  ink: 'sheen bg-ink text-white shadow-[0_0.3cqw_0.9cqw_rgba(11,11,12,0.22)]',
  // Sobre foto. A borda branca de 2px saiu: ela existia porque um `bg-white/10`
  // não é material nenhum e o botão precisava de um contorno para existir. O
  // vidro escuro é material, então o contorno virou o fio de luz da quina — e
  // o rótulo passou a ter um piso de contraste calculado em vez de contar com
  // a sorte do quadro do vídeo que estivesse atrás.
  ghost: 'glass-media has-warp',
  // The out. Same height as its sibling so "skip" never reads as second-class.
  quiet: 'glass text-ink',
  // The neutral half of a split bottom bar. No border: inside a full-bleed bar
  // a bordered pill reads as a mistake, and the stray edge made the two halves
  // 2px different, which is exactly the kind of "same weight" that is not.
  //
  // OPACA, como a barra que a hospeda. Ela ficou de vidro por um dia e deixava
  // a foto do prato aparecer atrás de "CARRINHO (1)" — sobre um fundo que ROLA,
  // ou seja, com o contraste do rótulo mudando a cada quadro. Um piso de alpha
  // garante o mínimo; ele não garante ESTABILIDADE, e é a estabilidade que
  // falta quando o fundo é um cardápio em movimento. Ver BottomBar.
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
        // Desabilitado sai do vidro por inteiro: um botão morto que continua
        // translúcido continua parecendo um botão vivo com a tela apagada, que
        // é o mesmo erro do vermelho lavado numa versão mais difícil de ver.
        // `[&::after]:hidden` apaga o realce junto — a quina de luz é o que diz
        // "peça acesa", e ela sozinha basta para o cliente continuar tocando.
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:border-transparent disabled:shadow-none',
        'disabled:backdrop-filter-none disabled:[&::after]:hidden',
        TONES[tone],
        SIZES[size],
        className,
      ].join(' ')}
      style={{ fontSize: 'var(--step-body)', ...rest.style }}
    >
      {/* A camada de refração só existe no tom que mora sobre foto. Nos outros
          o fundo é uma cor lisa, e refratar uma cor lisa devolve a mesma cor
          por um filtro SVG de graça nenhuma. */}
      {tone === 'ghost' ? <GlassWarp /> : null}
      {children}
    </button>
  )
}
