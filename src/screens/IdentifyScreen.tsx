import { useEffect, useMemo, useState } from 'react'
import { BottomBar, Chip, NumericKeypad, TotemButton } from '@/design'
import { recognitionDriver } from '@/session/useCustomerRecognition'
import { customerLookup, type RecognisedCustomer } from '@/session/customer-lookup'
import { useTotemSession } from '@/session/useTotemSession'
import { totemConfig } from '@/config/totem.config'

// ---------------------------------------------------------------------------
// Identification, and the permission not to.
//
// This screen is where a totem's adoption is won or lost. Mandatory
// identification is the fastest way to send a customer back to the till queue,
// so "continuar sem me identificar" is a full-size button with the same weight
// as the confirm — not a grey link under it. If the customer wants to skip, the
// panel should not make them feel they are doing something wrong.
//
// O TELEFONE agora paga por si: é ele que traz o nome, o crédito e a oferta, e
// é para onde o recibo vai no fim. Por isso é o padrão e o CPF é a segunda
// opção — a diferença entre pedir um dado e devolver alguma coisa por ele.
//
// A busca NUNCA bloqueia. Se falhar, demorar ou não achar ninguém, o cliente
// segue para o cardápio do mesmo jeito, com o telefone guardado. Um painel que
// trava numa consulta de fidelidade é um painel que gera fila.
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
  const [looking, setLooking] = useState(false)

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

  const proceed = (customer: RecognisedCustomer | null) => {
    identify({
      ...(kind === 'phone' ? { phone: digits } : { document: digits }),
      name: customer?.firstName ?? undefined,
      creditCents: customer?.creditCents ?? 0,
      offer: customer?.offer ?? null,
    })
  }

  const confirm = async () => {
    // O CPF não consulta nada: a base do totem é indexada por telefone, e
    // fingir uma busca que não existe só adiciona meio segundo de espera.
    if (kind !== 'phone') return proceed(null)

    setLooking(true)
    const outcome = await customerLookup().byPhone(digits)
    setLooking(false)

    if (outcome.status !== 'found') {
      // Silêncio de propósito. "Esse número não é cliente" transformaria o
      // teclado num oráculo de quais números existem na base — e, para quem só
      // quer almoçar, é uma frase que não muda nada do que vem a seguir.
      return proceed(null)
    }

    // Sem tela de "Oi, Marina!" no meio do caminho. Uma tela que só cumprimenta
    // e some sozinha é um passo a mais entre o cliente e a comida — e o que ela
    // dizia (nome, crédito, oferta) agora fica FIXO no topo do cardápio, onde a
    // pessoa pode reler quando quiser em vez de ter dois segundos para pegar.
    proceed(outcome.customer)
  }

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
          {/* A quebra vem do texto do tenant: "Seu telefone,\ne a gente cuida"
              e "Telefone?\nA gente te acha" quebram em pontos diferentes. */}
          {totemConfig.copy.identifyTitle.split('\n').map((line, index) => (
            <span key={line} className="block">
              {index > 0 ? null : null}
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-[2cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>
          {totemConfig.copy.identifySubtitle}
        </p>

        {/* mt-auto pushes the whole input block down to the hand. The rule in
            DESIGN.md is that the primary path lives below 40% of the panel;
            the keypad sitting at mid-height was breaking it. */}
        <div className="mt-auto grid grid-cols-2 gap-[3cqw] pt-[8cqw]">
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

        {/* O campo é um bloco de vidro, não um sublinhado. Um traço embaixo de
            um número gigante é a convenção de formulário de papel; numa tela de
            27" ele some, e o cliente não sabe onde o que ele digitou vai
            aparecer antes de digitar. */}
        <div
          data-testid="identify-value"
          className="tnum mt-[4cqw] flex min-h-[var(--tap-lg)] items-center rounded-[2.6cqw] bg-white/60 px-[4cqw] font-semibold tracking-tight backdrop-blur-xl shadow-[inset_0_0.14cqw_0_rgba(255,255,255,0.9),0_0.2cqw_0.6cqw_rgba(11,11,12,0.09)]"
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
          disabled={looking}
          onClick={() => identify(null)}
        >
          Agora não
        </TotemButton>
        <TotemButton
          tone="action"
          size="bar"
          className="flex-1"
          disabled={!complete || looking}
          data-testid="identify-confirm"
          onClick={confirm}
        >
          {looking ? 'Um instante…' : complete ? 'Continuar' : `Faltam ${rule.length - digits.length}`}
        </TotemButton>
      </BottomBar>
    </div>
  )
}
