import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { BottomBar, TotemButton, WhatsAppGlyph } from '@/design'
import { useWaiterDockInset } from '@/waiter/presence'
import { brl } from '@/cart/useCart'
import { printReceipt } from '@/orders/receipt-printer'
import { maskPhone, receiptDelivery, type DeliveryOutcome } from '@/orders/receipt-delivery'
import { useTotemSession } from '@/session/useTotemSession'

const RETURN_SECONDS = 15
/** Quanto tempo o painel dá depois que o cliente pede o WhatsApp. */
const GRACE_AFTER_SEND = 8

export function ReceiptScreen() {
  const placed = useTotemSession((s) => s.placed)
  const mode = useTotemSession((s) => s.mode)
  const customer = useTotemSession((s) => s.customer)
  const reset = useTotemSession((s) => s.reset)
  const dock = useWaiterDockInset()
  const [left, setLeft] = useState(RETURN_SECONDS)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<DeliveryOutcome | null>(null)

  // Auto-return, with the countdown ON SCREEN. A panel that resets without
  // warning while someone is still reading their number is a panel that makes
  // people ask staff what their number was.
  useEffect(() => {
    const timer = setInterval(() => setLeft((n) => n - 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (left <= 0) reset()
  }, [left, reset])

  if (!placed) return null

  const phone = customer?.phone
  const askWhatsApp = async () => {
    if (!phone || sending) return
    setSending(true)
    // O relógio ganha fôlego enquanto o painel fala com o banco: o cliente
    // acabou de pedir uma coisa, e a tela sumir no meio disso é a pior versão
    // possível de um timeout.
    setLeft((n) => Math.max(n, GRACE_AFTER_SEND))
    const outcome = await receiptDelivery().send({
      phone,
      order: placed,
      mode: mode ?? 'dine_in',
      customerName: customer?.name ?? null,
    })
    setSending(false)
    setSent(outcome)
    setLeft(GRACE_AFTER_SEND)
  }

  return (
    <div data-testid="screen-receipt" className="absolute inset-0 flex flex-col bg-ink text-white">
      {/* O conteúdo é centrado, então o rodapé ocupado não o corta: ele o
          empurra para cima. */}
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-[6cqw]"
        style={{ paddingBottom: `calc(var(--tap-bar) + ${dock})` }}
      >
        <p className="uppercase tracking-[0.4em] text-white/60" style={{ fontSize: 'var(--step-label)' }}>
          {customer?.name ? `${customer.name}, sua senha` : 'Sua senha'}
        </p>
        <p
          data-testid="receipt-ticket"
          className="tnum font-display leading-none"
          style={{ fontSize: 'var(--step-hero)' }}
        >
          {placed.ticket}
        </p>
        <p className="mt-[3cqw] text-center text-white/75" style={{ fontSize: 'var(--step-body)' }}>
          {mode === 'takeaway' ? 'Retire no balcão quando chamarmos.' : 'Leve a senha até a mesa.'}
        </p>

        <div className="mt-[8cqw] w-full max-w-[70cqw] rounded-totem bg-white p-[4cqw] text-ink">
          <div className="flex justify-between" style={{ fontSize: 'var(--step-body)' }}>
            <span className="uppercase tracking-[0.2em] text-muted">Total pago</span>
            <span className="tnum font-bold" data-testid="receipt-total">
              {brl(placed.totalCents)}
            </span>
          </div>
          <p className="tnum mt-[2cqw] text-muted" style={{ fontSize: 'var(--step-label)' }}>
            {placed.referenceNumber}
          </p>
        </div>

        {/* Só aparece para quem deu o telefone. Pedir o número AGORA, com a
            bandeja na mão e uma fila atrás, é pedir na pior hora possível — e é
            exatamente por isso que a tela de identificação se paga. */}
        {phone ? (
          <WhatsAppOffer phone={phone} sending={sending} outcome={sent} onAsk={askWhatsApp} />
        ) : null}

        <p
          data-testid="receipt-countdown"
          className="tnum mt-[6cqw] uppercase tracking-[0.3em] text-white/50"
          style={{ fontSize: 'var(--step-label)' }}
        >
          voltando em {Math.max(0, left)}s
        </p>
      </div>

      <BottomBar>
        <TotemButton
          tone="bar-quiet"
          size="bar"
          className="flex-1"
          data-testid="receipt-print"
          onClick={() => printReceipt(placed, mode ?? 'dine_in')}
        >
          <Printer strokeWidth={3} className="size-[2.4cqw]" /> Imprimir
        </TotemButton>
        <TotemButton tone="action" size="bar" className="flex-1" data-testid="receipt-done" onClick={reset}>
          Concluir
        </TotemButton>
      </BottomBar>
    </div>
  )
}

/**
 * "Vai chegar no seu WhatsApp" — e não "enviado".
 *
 * A mensagem nasce `queued` no banco e só sai quando o broker (FAY-1423)
 * estiver ligado neste tenant. As duas frases descrevem estados diferentes do
 * mundo, e a errada aqui é o cliente olhando o celular no ponto de ônibus
 * esperando uma coisa que não vem.
 */
function WhatsAppOffer({
  phone,
  sending,
  outcome,
  onAsk,
}: {
  phone: string
  sending: boolean
  outcome: DeliveryOutcome | null
  onAsk: () => void
}) {
  if (outcome?.status === 'queued') {
    return (
      <p
        data-testid="whatsapp-queued"
        className="mt-[6cqw] flex items-center gap-[2.5cqw] rounded-totem bg-white/12 px-[5cqw] py-[3.5cqw]"
        style={{ fontSize: 'var(--step-body)' }}
      >
        <WhatsAppGlyph className="size-[3.4cqw] shrink-0" />
        Vai chegar no {maskPhone(phone)}
      </p>
    )
  }

  if (outcome) {
    // Falhar em silêncio aqui é pior do que não ter oferecido: a pessoa vai
    // embora achando que tem recibo. O papel continua ali, na barra de baixo.
    const message =
      outcome.status === 'refused' && outcome.reason === 'opted_out'
        ? 'Esse número pediu para não receber nossas mensagens.'
        : 'Não deu para mandar agora. Se quiser, imprima abaixo.'
    return (
      <p
        data-testid="whatsapp-failed"
        role="alert"
        className="mt-[6cqw] text-center text-white/70"
        style={{ fontSize: 'var(--step-body)' }}
      >
        {message}
      </p>
    )
  }

  return (
    <button
      type="button"
      data-testid="receipt-whatsapp"
      disabled={sending}
      onClick={onAsk}
      className="press mt-[6cqw] flex min-h-[var(--tap-lg)] items-center gap-[3cqw] rounded-totem bg-white px-[5cqw] text-ink disabled:opacity-60"
    >
      <WhatsAppGlyph className="size-[4cqw] shrink-0" />
      <span className="text-left">
        <span className="block font-bold uppercase tracking-[0.1em]" style={{ fontSize: 'var(--step-body)' }}>
          {sending ? 'Mandando…' : 'Receber no WhatsApp'}
        </span>
        <span className="block uppercase tracking-[0.18em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
          {maskPhone(phone)}
        </span>
      </span>
    </button>
  )
}
