import type {
  ChargeRequest,
  ChargeResult,
  PaymentStatus,
  PaymentTerminalDriver,
} from '@/payment/driver'

// The V1 driver: approves after a beat, so the whole flow can be walked and
// tested before the hardware exists.
//
// It also declines on demand (`VITE_TOTEM_TERMINAL_MOCK=decline`), because the
// screens that matter most on a kiosk are the ones nobody demos: the decline,
// the cancel and the timeout.
export function createMockTerminal(): PaymentTerminalDriver {
  let status: PaymentStatus = 'idle'
  let cancelled = false

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  return {
    id: 'mock',
    getStatus: () => status,

    async cancel() {
      cancelled = true
      status = 'cancelled'
    },

    async charge(request: ChargeRequest, onStatus): Promise<ChargeResult> {
      cancelled = false
      const set = (next: PaymentStatus) => {
        status = next
        onStatus(next)
      }

      const card = request.method !== 'pix'
      set(card ? 'awaiting_card' : 'processing')
      await wait(card ? 1200 : 600)
      if (cancelled) return { status: 'cancelled', message: 'Pagamento cancelado.' }

      set('processing')
      await wait(800)
      if (cancelled) return { status: 'cancelled', message: 'Pagamento cancelado.' }

      if (import.meta.env.VITE_TOTEM_TERMINAL_MOCK === 'decline') {
        set('declined')
        return { status: 'declined', message: 'Cartão recusado pelo banco. Tente outro cartão.' }
      }

      set('approved')
      return {
        status: 'approved',
        authCode: `MOCK${String(request.amountCents).padStart(6, '0')}`,
        brand: card ? 'MOCK' : undefined,
        nsu: request.orderRef.slice(-8),
        installments: 1,
        pixPayload: request.method === 'pix' ? `00020126MOCK-${request.orderRef}` : undefined,
      }
    },
  }
}
