import { useState } from 'react'
import { Check, CreditCard, Gift, QrCode, Wallet, X } from 'lucide-react'
import { BottomBar, TotemButton } from '@/design'
import { useWaiterDockInset } from '@/waiter/presence'
import { brl, cartTotalCents, useCart } from '@/cart/useCart'
import { paymentTerminal, type PaymentMethod, type PaymentStatus } from '@/payment'
import { placeOrder } from '@/orders/place-order'
import { computeTotals, offerLabel } from '@/orders/totals'
import { useTotemSession } from '@/session/useTotemSession'
import { totemConfig } from '@/config/totem.config'
import { announceToWaiter } from '@/waiter/events'

// Crédito e débito são botões separados porque são dinheiro separado: o razão
// liquida cada um numa conta diferente, e um quiosque que adivinhasse jogaria
// metade do que passa no cartão na conta errada. Dinheiro não está aqui — o
// painel não tem gaveta, então a cédula é assunto do caixa.
const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'credit', label: 'Crédito', icon: <CreditCard strokeWidth={2} className="size-[5cqw]" />, hint: 'na maquininha ao lado' },
  { id: 'debit', label: 'Débito', icon: <Wallet strokeWidth={2} className="size-[5cqw]" />, hint: 'na maquininha ao lado' },
  { id: 'pix', label: 'Pix', icon: <QrCode strokeWidth={2} className="size-[5cqw]" />, hint: 'QR code aqui na tela' },
]

const SAYS: Record<PaymentStatus, string> = {
  idle: '',
  awaiting_card: 'Aproxime, insira ou passe o cartão na maquininha',
  processing: 'Processando…',
  approved: 'Aprovado!',
  declined: 'Não aprovado',
  cancelled: 'Cancelado',
  timeout: 'A maquininha não respondeu',
}

export function PaymentScreen() {
  const lines = useCart((s) => s.lines)
  const clearCart = useCart((s) => s.clear)
  const { mode, customer, goTo, completeOrder } = useTotemSession()
  const [method, setMethod] = useState<PaymentMethod>('credit')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [terminal] = useState(paymentTerminal)
  const [useCredit, setUseCredit] = useState(true)
  const dock = useWaiterDockInset()

  // O crédito é opcional POR PADRÃO LIGADO: quem tem saldo quase sempre quer
  // gastá-lo, e quem não quer desliga num toque. O contrário faz a pessoa pagar
  // por cima do próprio dinheiro sem perceber.
  const totals = computeTotals({
    subtotalCents: cartTotalCents(lines),
    offer: customer?.offer,
    availableCreditCents: customer?.creditCents ?? 0,
    useCredit,
  })
  const totalCents = totals.totalCents
  const hasCredit = (customer?.creditCents ?? 0) > 0
  const busy = status === 'awaiting_card' || status === 'processing'

  const pay = async () => {
    setError(null)
    const orderRef = `${Date.now()}`
    // Uma conta zerada por crédito não tem o que cobrar. Mandar R$ 0,00 para a
    // maquininha é um jeito garantido de ver um erro de terminal na frente do
    // cliente por causa de um desconto que deu certo.
    const result =
      totalCents === 0
        ? ({ status: 'approved' as const, authCode: 'CREDITO', installments: 1 })
        : await terminal.charge({ amountCents: totalCents, method, orderRef }, (next) => {
            setStatus(next)
            if (next === 'awaiting_card') announceToWaiter({ type: 'payment_awaiting_card' })
            if (next === 'processing') announceToWaiter({ type: 'payment_processing' })
          })

    if (result.status !== 'approved') {
      const said = result.message ?? SAYS[result.status]
      setError(said)
      announceToWaiter({ type: 'payment_declined', reason: said })
      return
    }

    try {
      const placed = await placeOrder({
        lines,
        mode: mode ?? 'dine_in',
        customer,
        payment: result,
        method,
        totals,
      })
      clearCart()
      completeOrder(placed)
      announceToWaiter({
        type: 'order_placed',
        ticket: placed.ticket,
        mode: mode ?? 'dine_in',
      })
    } catch (cause) {
      // The money is taken and the order did not save. Say so plainly and name
      // the counter: silently returning to the menu would let a customer pay
      // twice for a meal the kitchen never saw.
      setStatus('declined')
      announceToWaiter({ type: 'order_failed', reference: orderRef })
      setError(
        `Pagamento aprovado, mas o pedido não foi registrado. Procure o caixa com este código: ${orderRef}. (${
          cause instanceof Error ? cause.message : String(cause)
        })`,
      )
    }
  }

  return (
    <div data-testid="screen-payment" className="absolute inset-0 flex flex-col bg-page">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[6cqw] pt-[8cqw]"
        // A faixa do garçom, quando ele está acompanhando, come o rodapé desta
        // tela — e o rodapé desta tela é uma forma de pagamento. Ela apareceu
        // por cima do PIX exatamente por não estar reservada aqui.
        style={{ paddingBottom: `calc(var(--tap-bar) + ${dock} + 4cqw)` }}
      >
        <h1 className="font-display uppercase leading-[0.9] tracking-tight" style={{ fontSize: 'var(--step-display)' }}>
          {totemConfig.copy.paymentTitle}
        </h1>

        {/* The amount is the biggest thing on the screen. It is the one number
            a customer must not be surprised by at the terminal. */}
        <div className="mt-[4cqw] rounded-totem bg-ink px-[5cqw] py-[4cqw] text-white">
          <p className="uppercase tracking-[0.3em] text-white/55" style={{ fontSize: 'var(--step-label)' }}>
            Total a pagar
          </p>
          <p
            data-testid="payment-total"
            className="tnum font-display leading-none"
            style={{ fontSize: 'var(--step-hero)' }}
          >
            {brl(totalCents)}
          </p>
          <p className="mt-[1cqw] uppercase tracking-[0.2em] text-white/55" style={{ fontSize: 'var(--step-label)' }}>
            {lines.reduce((n, l) => n + l.quantity, 0)} {lines.reduce((n, l) => n + l.quantity, 0) === 1 ? 'item' : 'itens'}
          </p>

          {/* De onde veio o abatimento, linha a linha. Um total menor do que a
              soma do carrinho sem explicação é a coisa que mais faz cliente
              chamar o caixa — mesmo quando o desconto é a favor dele. */}
          {totals.offerCents > 0 || totals.creditCents > 0 ? (
            <div
              data-testid="payment-breakdown"
              className="mt-[3cqw] border-t-2 border-white/15 pt-[3cqw]"
              style={{ fontSize: 'var(--step-label)' }}
            >
              <Row label="Subtotal" value={brl(totals.subtotalCents)} />
              {totals.offerCents > 0 && customer?.offer ? (
                <Row
                  testId="payment-offer"
                  label={`${customer.offer.title} · ${offerLabel(customer.offer)}`}
                  value={`− ${brl(totals.offerCents)}`}
                />
              ) : null}
              {totals.creditCents > 0 ? (
                <Row testId="payment-credit" label="Seu crédito" value={`− ${brl(totals.creditCents)}`} />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Só aparece para quem tem saldo. Guardar o crédito para a próxima é
            uma escolha legítima — e uma que o cliente só consegue fazer se ela
            estiver na tela onde o dinheiro está sendo gasto. */}
        {hasCredit ? (
          <button
            type="button"
            data-testid="toggle-credit"
            aria-pressed={useCredit}
            disabled={busy}
            onClick={() => setUseCredit((v) => !v)}
            className={[
              'press mt-[3cqw] flex min-h-[var(--tap)] items-center gap-[3cqw] rounded-totem px-[4cqw] text-left',
              useCredit ? 'bg-ink text-white' : 'border-2 border-edge bg-white text-ink',
              'disabled:opacity-50',
            ].join(' ')}
          >
            <Wallet strokeWidth={2.5} className="size-[4cqw] shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold uppercase tracking-[0.12em]" style={{ fontSize: 'var(--step-body)' }}>
                Usar {brl(customer?.creditCents ?? 0)} de crédito
              </span>
              <span
                className={['block uppercase tracking-[0.18em]', useCredit ? 'text-white/60' : 'text-muted'].join(' ')}
                style={{ fontSize: 'var(--step-label)' }}
              >
                {useCredit ? 'aplicado neste pedido' : 'guardado para a próxima'}
              </span>
            </span>
            <Check strokeWidth={3} className={['size-[3.4cqw] shrink-0', useCredit ? 'opacity-100' : 'opacity-0'].join(' ')} />
          </button>
        ) : null}

        {/* A oferta que não bateu o mínimo é informação, não decoração: dizer
            quanto falta é a única forma de o cliente decidir se vale a pena. */}
        {customer?.offer && totals.offerCents === 0 ? (
          <p
            data-testid="payment-offer-locked"
            className="mt-[3cqw] flex items-center gap-[2cqw] rounded-totem bg-white p-[3cqw] text-muted"
            style={{ fontSize: 'var(--step-label)' }}
          >
            <Gift strokeWidth={2.5} className="size-[3.4cqw] shrink-0" />
            {customer.offer.title} vale a partir de {brl(customer.offer.minSubtotalCents)} — faltam{' '}
            {brl(customer.offer.minSubtotalCents - totals.subtotalCents)}.
          </p>
        ) : null}

        <div className="mt-auto pt-[6cqw]">
          {/* One method per row, not a grid of squares: the label and the
              instruction ("na maquininha ao lado") sit side by side, and the
              chosen one is unmistakable rather than one dark tile among three. */}
          {/* O painel não tem gaveta. Oferecer um botão que ele não consegue
              honrar é o cliente parado com a cédula na mão e ninguém a quem
              entregá-la; dizer para onde ir custa uma linha. */}
          <p
            data-testid="payment-no-cash"
            className="mb-[3cqw] text-muted"
            style={{ fontSize: 'var(--step-label)' }}
          >
            Em dinheiro, faça o pedido no caixa.
          </p>
          <div className="flex flex-col gap-[2cqw]">
            {METHODS.map((option) => {
              const chosen = method === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`pay-${option.id}`}
                  aria-pressed={chosen}
                  disabled={busy}
                  onClick={() => {
              setMethod(option.id)
              // O garçom explica a maquininha. É a instrução que mais se perde
              // lida: o cliente está de pé, olhando o painel a um metro.
              announceToWaiter({ type: 'payment_method_chosen', method: option.id })
            }}
                  className={[
                    'press flex min-h-[var(--tap-lg)] items-center gap-[3cqw] rounded-totem px-[4cqw] text-left',
                    chosen ? 'bg-ink text-white' : 'bg-white text-ink border-2 border-edge',
                    'disabled:opacity-50',
                  ].join(' ')}
                >
                  <span className={chosen ? 'text-white' : 'text-ink'}>{option.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block font-semibold uppercase tracking-[0.12em]"
                      style={{ fontSize: 'var(--step-body)' }}
                    >
                      {option.label}
                    </span>
                    <span
                      className={['block uppercase tracking-[0.18em]', chosen ? 'text-white/60' : 'text-muted'].join(' ')}
                      style={{ fontSize: 'var(--step-label)' }}
                    >
                      {option.hint}
                    </span>
                  </span>
                  <Check
                    strokeWidth={3}
                    className={['size-[3.4cqw] shrink-0', chosen ? 'opacity-100' : 'opacity-0'].join(' ')}
                  />
                </button>
              )
            })}
          </div>

          {status !== 'idle' ? (
            <p
              data-testid="payment-status"
              aria-live="polite"
              className="mt-[5cqw] text-center font-bold uppercase tracking-[0.15em]"
              style={{ fontSize: 'var(--step-body)' }}
            >
              {SAYS[status]}
            </p>
          ) : null}

          {error ? (
            <p
              data-testid="payment-error"
              role="alert"
              className="mt-[3cqw] rounded-totem bg-white p-[3cqw] text-center text-action"
              style={{ fontSize: 'var(--step-body)' }}
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <BottomBar>
        <TotemButton
          tone="bar-quiet"
          size="bar"
          className="flex-1"
          data-testid="payment-back"
          onClick={async () => {
            // Cancel is available at every moment, including mid-charge: a
            // customer who cannot back out of a payment screen calls staff.
            if (busy) await terminal.cancel()
            goTo('menu')
          }}
        >
          <X strokeWidth={3} className="size-[2.4cqw]" /> {busy ? 'Cancelar' : 'Voltar'}
        </TotemButton>
        <TotemButton
          tone="action"
          size="bar"
          className="flex-[1.4]"
          data-testid="pay-now"
          disabled={busy || lines.length === 0}
          onClick={pay}
        >
          {busy ? 'Aguarde…' : error ? 'Tentar de novo' : totalCents === 0 ? 'Confirmar pedido' : 'Pagar'}
        </TotemButton>
      </BottomBar>
    </div>
  )
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div data-testid={testId} className="flex items-baseline justify-between gap-[3cqw] py-[0.8cqw]">
      <span className="min-w-0 uppercase tracking-[0.15em] text-white/55">{label}</span>
      <span className="tnum shrink-0 text-white/85">{value}</span>
    </div>
  )
}
