import { Delete } from 'lucide-react'

// ---------------------------------------------------------------------------
// Phone / CPF entry. There is no hardware keyboard on a totem and the OS
// keyboard is a way out of the app, so the panel brings its own.
//
// Keys are --tap-lg (104px) and the grid gap is 16px: at 82 DPI that is 32mm
// of key and 5mm of gutter, which is what it takes for a wrong digit to be
// rare rather than routine. Backspace sits bottom-right where the thumb of a
// right-handed customer already is; "0" keeps the centre column.
// ---------------------------------------------------------------------------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export interface NumericKeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
  disabled?: boolean
}

export function NumericKeypad({ onDigit, onBackspace, disabled = false }: NumericKeypadProps) {
  const keyClass =
    'press grid min-h-[var(--tap-lg)] place-items-center rounded-totem border-2 border-edge bg-white font-semibold tnum disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg'

  return (
    <div className="grid grid-cols-3 gap-4" data-testid="keypad">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          data-testid={`key-${key}`}
          onClick={() => onDigit(key)}
          className={keyClass}
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
        className={keyClass}
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
        className={keyClass}
      >
        <Delete strokeWidth={2.5} className="size-[3.4cqw]" />
      </button>
    </div>
  )
}
