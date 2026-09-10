import { Delete } from 'lucide-react'

// ---------------------------------------------------------------------------
// Phone / CPF entry. There is no hardware keyboard on a totem and the OS
// keyboard is a way out of the app, so the panel brings its own.
//
// Keys are --tap-lg (104px) and the grid gap is 16px: at 82 DPI that is 32mm
// of key and 5mm of gutter, which is what it takes for a wrong digit to be
// rare rather than routine. Backspace sits bottom-right where the thumb of a
// right-handed customer already is; "0" keeps the centre column.
//
// A LINGUAGEM é a do teclado do iOS, não a de uma tabela: teclas redondas, sem
// contorno, sobre um vidro fosco. A versão anterior era um grid de retângulos
// com borda de 2px — legível, e parecendo um formulário de banco. A borda é o
// que mais pesava: nove molduras pretas competindo com os nove números que a
// pessoa precisa ler. Tirada a borda, o número vira o objeto.
//
// O toque afunda a tecla e escurece o vidro em vez de mudar de cor. `:hover`
// continua proibido em todo o app — num painel de toque ele gruda no último
// elemento tocado e lê como uma seleção travada que nada limpa.
// ---------------------------------------------------------------------------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export interface NumericKeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
  disabled?: boolean
}

/**
 * Vidro, com a tonalidade e a espessura da casa — mas sem desfoque nenhum.
 *
 * O teclado inteiro mora sobre a PÁGINA, que é uma cor chapada. Era um
 * `backdrop-blur-xl` por tecla: doze camadas de composição desfocando uma cor
 * lisa, ou seja, doze camadas pintando exatamente o que já estava embaixo. O
 * desfoque não é o material; o material é a tonalidade mais a quina de luz, e
 * essa não custa camada nenhuma. O desfoque fica para as panes que TÊM o que
 * desfocar — a barra de baixo e o vidro sobre foto.
 *
 * O toque afunda a tecla e ESCURECE o vidro, e agora com `brightness` em vez de
 * trocar de cor de fundo: a cor de fundo vem do tema, e um `active:bg-white/85`
 * escrito no arquivo devolvia o branco fixo por cima da tonalidade da casa —
 * a tecla pressionada perdia a marca no instante em que o dedo a tocava.
 */
const GLASS =
  'press glass grid min-h-[calc(var(--tap-lg)*1.25)] place-items-center rounded-[3cqw] ' +
  'active:brightness-[0.93] disabled:bg-black/[0.04] disabled:text-disabled-fg disabled:shadow-none ' +
  'disabled:[&::after]:hidden'

export function NumericKeypad({ onDigit, onBackspace, disabled = false }: NumericKeypadProps) {
  return (
    // Estreitado e centrado: a três colunas na largura inteira do painel as
    // teclas viravam retângulos de 320x104, e uma tecla três vezes mais larga
    // que alta não é lida como tecla. Em 78cqw elas ficam perto do quadrado do
    // teclado do iOS sem perder um milímetro do piso de toque.
    <div className="mx-auto grid w-full max-w-[78cqw] grid-cols-3 gap-[2.4cqw]" data-testid="keypad">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          data-testid={`key-${key}`}
          onClick={() => onDigit(key)}
          className={`${GLASS} tnum font-medium tracking-tight`}
          style={{ fontSize: 'var(--step-title)' }}
        >
          {key}
        </button>
      ))}

      {/* Bottom row: the empty cell is deliberate. Filling it with a "clear"
          next to "0" is how customers wipe an eight-digit phone by accident. */}
      <span aria-hidden />
      <button
        type="button"
        disabled={disabled}
        data-testid="key-0"
        onClick={() => onDigit('0')}
        className={`${GLASS} tnum font-medium tracking-tight`}
        style={{ fontSize: 'var(--step-title)' }}
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-label="Apagar"
        data-testid="key-backspace"
        onClick={onBackspace}
        // Apagar é a única tecla que não é um número, então é a única sem o
        // vidro: um POÇO em vez de uma pane. A quina de luz sai junto com a
        // pane — ela é o que diz "isto está por cima", e uma tecla afundada com
        // brilho de peça saliente é a contradição que faz o olho parar.
        // Escuro e não vermelho: vermelho aqui brigaria com o botão de pagar.
        className={`${GLASS} !bg-black/[0.05] active:!bg-black/[0.11] text-ink/60 !shadow-none [&::after]:hidden`}
      >
        <Delete strokeWidth={2} className="size-[3.4cqw]" />
      </button>
    </div>
  )
}
