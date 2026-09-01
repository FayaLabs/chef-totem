import { useEffect, useMemo, useState } from 'react'
import { BottomBar, Chip, NumericKeypad, TotemButton } from '@/design'
import { recognitionDriver } from '@/session/useCustomerRecognition'
import { useTotemSession } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// Identification, and the permission not to.
//
// This screen is where a totem's adoption is won or lost. Mandatory
// identification is the fastest way to send a customer back to the till queue,
// so "continuar sem me identificar" is a full-size button with the same weight
// as the confirm — not a grey link under it. If the customer wants to skip, the
// panel should not make them feel they are doing something wrong.
// ---------------------------------------------------------------------------

type Kind = 'phone' | 'document'

const RULES: Record<Kind, { label: string; length: number; hint: string; format: (v: string) => string }> = {
  phone: {
    label: 'Telefone',
    length: 11,
    hint: 'DDD + número',
    format: (v) =>
      v.length <= 2
        ? v
        : v.length <= 7
          ? `(${v.slice(0, 2)}) ${v.slice(2)}`
          : `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`,
  },
  document: {
    label: 'CPF',
    length: 11,
    hint: 'só os números',
    format: (v) =>
      [v.slice(0, 3), v.slice(3, 6), v.slice(6, 9)].filter(Boolean).join('.') +
      (v.length > 9 ? `-${v.slice(9)}` : ''),
  },
}

export function IdentifyScreen() {
  const identify = useTotemSession((s) => s.identify)
  const [kind, setKind] = useState<Kind>('phone')
  const [digits, setDigits] = useState('')

  const rule = RULES[kind]
  const complete = digits.length === rule.length

  // The driver is started and stopped even though the manual one does nothing:
  // when the camera driver lands it must already have a lifecycle to hang the
  // stream on, and `end()` must already be guaranteed to run.
  useEffect(() => {
    const driver = recognitionDriver()
    void driver.begin()
    return () => driver.end()
  }, [])

  const shown = useMemo(() => rule.format(digits), [rule, digits])

  return (
    <div data-testid="screen-identify" className="absolute inset-0 bg-page">
      {/* pb reserves the bar: this screen had its own action row AND a bar, and
          the bar sat on top of the buttons. Two bottom chromes is one too many
          — the actions ARE the bar. */}
      <div className="flex size-full flex-col overflow-y-auto px-[6cqw] pt-[8cqw] pb-[calc(var(--tap-bar)+4cqw)]">
        <h1
          className="font-display uppercase leading-[0.9] tracking-tight"
          style={{ fontSize: 'var(--step-display)' }}
        >
          Quer o cupom
          <br />
          no seu nome?
        </h1>
        <p className="mt-[2cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>
          Serve para o programa de fidelidade. Não é obrigatório.
        </p>

        {/* mt-auto pushes the whole input block down to the hand. The rule in
            DESIGN.md is that the primary path lives below 40% of the panel;
            the keypad sitting at mid-height was breaking it. */}
        <div className="mt-auto pt-[8cqw] grid grid-cols-2 gap-[3cqw]">
          {(Object.keys(RULES) as Kind[]).map((option) => (
            <Chip
              key={option}
              selected={kind === option}
              data-testid={`kind-${option}`}
              onClick={() => {
                setKind(option)
                setDigits('')
              }}
            >
              {RULES[option].label}
            </Chip>
          ))}
        </div>

        <div
          data-testid="identify-value"
          className="tnum mt-[5cqw] flex min-h-[var(--tap-lg)] items-center border-b-4 border-edge font-bold"
          style={{ fontSize: 'var(--step-title)' }}
        >
          {shown || <span className="font-normal text-muted">{rule.hint}</span>}
        </div>

        <div className="mt-[5cqw]">
          <NumericKeypad
            onDigit={(digit) => setDigits((v) => (v.length < rule.length ? v + digit : v))}
            onBackspace={() => setDigits((v) => v.slice(0, -1))}
          />
        </div>
      </div>

      {/* Both actions the same size, sharing the bar. The skip is not a lesser
          choice, so it does not get a lesser control. */}
      <BottomBar>
        <TotemButton
          tone="bar-quiet"
          size="bar"
          className="flex-1"
          data-testid="identify-skip"
          onClick={() => identify(null)}
        >
          Agora não
        </TotemButton>
        <TotemButton
          tone="action"
          size="bar"
          className="flex-1"
          disabled={!complete}
          data-testid="identify-confirm"
          onClick={() => identify(kind === 'phone' ? { phone: digits } : { document: digits })}
        >
          {complete ? 'Continuar' : `Faltam ${rule.length - digits.length}`}
        </TotemButton>
      </BottomBar>
    </div>
  )
}
