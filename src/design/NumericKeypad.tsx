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
 * Vidro: translúcido sobre o fundo da página, com blur e uma linha de luz no
 * topo. `backdrop-blur` sem cor de fundo não aparece — o branco a 55% é o que
 * dá o material; o blur só o torna profundo.
 */
const GLASS =
  'press grid min-h-[calc(var(--tap-lg)*1.25)] place-items-center rounded-[3cqw] bg-white/55 backdrop-blur-xl ' +
  'shadow-[inset_0_0.14cqw_0_rgba(255,255,255,0.9),0_0.25cqw_0.7cqw_rgba(11,11,12,0.10)] ' +
  'active:bg-white/85 disabled:bg-black/[0.04] disabled:text-disabled-fg disabled:shadow-none'

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
        // vidro: um fundo mais fundo diz "esta é diferente" sem precisar de
        // cor, que aqui seria vermelho e brigaria com o botão de pagar.
        className={`${GLASS} !bg-black/[0.05] active:!bg-black/[0.11] text-ink/60`}
      >
        <Delete strokeWidth={2} className="size-[3.4cqw]" />
      </button>
    </div>
  )
}
