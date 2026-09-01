import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { BottomBar, TotemButton } from '@/design'
import { brl } from '@/cart/useCart'
import { printReceipt } from '@/orders/receipt-printer'
import { useTotemSession } from '@/session/useTotemSession'

const RETURN_SECONDS = 15

export function ReceiptScreen() {
  const placed = useTotemSession((s) => s.placed)
  const mode = useTotemSession((s) => s.mode)
  const reset = useTotemSession((s) => s.reset)
  const [left, setLeft] = useState(RETURN_SECONDS)

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

  return (
    <div data-testid="screen-receipt" className="absolute inset-0 flex flex-col bg-ink text-white">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[6cqw]">
        <p className="uppercase tracking-[0.4em] text-white/60" style={{ fontSize: 'var(--step-label)' }}>
          Sua senha
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
