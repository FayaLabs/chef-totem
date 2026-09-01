import { useState } from 'react'
import { Banknote, CreditCard, QrCode, X } from 'lucide-react'
import { BottomBar, TotemButton } from '@/design'
import { brl, cartTotalCents, useCart } from '@/cart/useCart'
import { paymentTerminal, type PaymentMethod, type PaymentStatus } from '@/payment'
import { placeOrder } from '@/orders/place-order'
import { useTotemSession } from '@/session/useTotemSession'

const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'card', label: 'Cartão', icon: <CreditCard strokeWidth={2} className="size-[7cqw]" />, hint: 'na maquininha' },
  { id: 'pix', label: 'Pix', icon: <QrCode strokeWidth={2} className="size-[7cqw]" />, hint: 'QR na tela' },
  { id: 'cash', label: 'Dinheiro', icon: <Banknote strokeWidth={2} className="size-[7cqw]" />, hint: 'no caixa' },
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
        <p className="tnum mt-[2cqw] font-bold text-action" style={{ fontSize: 'var(--step-title)' }}>
          {brl(totalCents)}
        </p>

        <div className="mt-auto pt-[6cqw]">
          <div className="grid grid-cols-3 gap-[3cqw]">
            {METHODS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-testid={`pay-${option.id}`}
                aria-pressed={method === option.id}
                disabled={busy}
                onClick={() => setMethod(option.id)}
                className={[
                  'press flex min-h-[26cqw] flex-col items-center justify-center gap-[2cqw] rounded-totem',
                  method === option.id ? 'bg-ink text-white' : 'bg-white text-ink border-2 border-edge',
                  'disabled:opacity-50',
                ].join(' ')}
              >
                {option.icon}
                <span className="font-semibold uppercase tracking-[0.12em]" style={{ fontSize: 'var(--step-body)' }}>
                  {option.label}
                </span>
                <span className="uppercase tracking-[0.2em] opacity-60" style={{ fontSize: 'var(--step-label)' }}>
                  {option.hint}
                </span>
              </button>
            ))}
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
