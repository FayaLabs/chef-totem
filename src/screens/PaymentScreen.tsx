import { useState } from 'react'
import { Banknote, Check, CreditCard, QrCode, X } from 'lucide-react'
import { BottomBar, TotemButton } from '@/design'
import { brl, cartTotalCents, useCart } from '@/cart/useCart'
import { paymentTerminal, type PaymentMethod, type PaymentStatus } from '@/payment'
import { placeOrder } from '@/orders/place-order'
import { useTotemSession } from '@/session/useTotemSession'

const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'card', label: 'Cartão', icon: <CreditCard strokeWidth={2} className="size-[5cqw]" />, hint: 'na maquininha ao lado' },
  { id: 'pix', label: 'Pix', icon: <QrCode strokeWidth={2} className="size-[5cqw]" />, hint: 'QR code aqui na tela' },
  { id: 'cash', label: 'Dinheiro', icon: <Banknote strokeWidth={2} className="size-[5cqw]" />, hint: 'pague no caixa' },
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
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [terminal] = useState(paymentTerminal)

  const totalCents = cartTotalCents(lines)
  const busy = status === 'awaiting_card' || status === 'processing'

  const pay = async () => {
    setError(null)
    const orderRef = `${Date.now()}`
    const result = await terminal.charge({ amountCents: totalCents, method, orderRef }, setStatus)

    if (result.status !== 'approved') {
      setError(result.message ?? SAYS[result.status])
      return
    }

    try {
      const placed = await placeOrder({ lines, mode: mode ?? 'dine_in', customer, payment: result, method })
      clearCart()
      completeOrder(placed)
    } catch (cause) {
      // The money is taken and the order did not save. Say so plainly and name
      // the counter: silently returning to the menu would let a customer pay
      // twice for a meal the kitchen never saw.
      setStatus('declined')
      setError(
        `Pagamento aprovado, mas o pedido não foi registrado. Procure o caixa com este código: ${orderRef}. (${
          cause instanceof Error ? cause.message : String(cause)
        })`,
      )
    }
  }

  return (
    <div data-testid="screen-payment" className="absolute inset-0 flex flex-col bg-page">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[6cqw] pb-[calc(var(--tap-bar)+4cqw)] pt-[8cqw]">
        <h1 className="font-display uppercase leading-[0.9] tracking-tight" style={{ fontSize: 'var(--step-display)' }}>
          Como quer pagar?
        </h1>

        {/* The amount is the biggest thing on the screen. It is the one number
            a customer must not be surprised by at the terminal. */}
        <div className="mt-[4cqw] rounded-totem bg-ink px-[5cqw] py-[4cqw] text-white">
          <p className="uppercase tracking-[0.3em] text-white/55" style={{ fontSize: 'var(--step-label)' }}>
            Total a pagar
          </p>
          <p className="tnum font-display leading-none" style={{ fontSize: 'var(--step-hero)' }}>
            {brl(totalCents)}
          </p>
          <p className="mt-[1cqw] uppercase tracking-[0.2em] text-white/55" style={{ fontSize: 'var(--step-label)' }}>
            {lines.reduce((n, l) => n + l.quantity, 0)} {lines.reduce((n, l) => n + l.quantity, 0) === 1 ? 'item' : 'itens'}
          </p>
        </div>

        <div className="mt-auto pt-[6cqw]">
          {/* One method per row, not a grid of squares: the label and the
              instruction ("na maquininha ao lado") sit side by side, and the
              chosen one is unmistakable rather than one dark tile among three. */}
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
                  onClick={() => setMethod(option.id)}
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
          {busy ? 'Aguarde…' : error ? 'Tentar de novo' : 'Pagar'}
        </TotemButton>
      </BottomBar>
    </div>
  )
}
