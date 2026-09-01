import { totemConfig } from '@/config/totem.config'
import type { CompletedOrder, ServiceMode } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// Paper.
//
// V1 is the browser's own print path: the panel's printer is installed in the
// OS, `window.print()` reaches it, and a print stylesheet decides what lands on
// the paper. Crude, but it needs nothing installed and works the day the panel
// arrives.
//
// TODO(FAY-1447): an ESC/POS driver over the thermal printer's USB endpoint
// gives a real 80mm ticket with a cut and a drawer kick, but it needs the same
// local bridge the pinpad may need — so it waits for that decision rather than
// growing a second one.
// ---------------------------------------------------------------------------

export interface ReceiptPrinter {
  readonly id: string
  print(order: CompletedOrder, mode: ServiceMode): void
}

function browserPrinter(): ReceiptPrinter {
  return {
    id: 'browser-print',
    print(order, mode) {
      const frame = document.createElement('iframe')
      // Printing the panel itself would put the whole kiosk UI on the paper.
      frame.style.position = 'fixed'
      frame.style.inset = '-9999px auto auto -9999px'
      document.body.append(frame)

      const doc = frame.contentDocument
      if (!doc) return
      doc.write(`<!doctype html><meta charset="utf-8"><style>
        @page { size: 80mm auto; margin: 4mm }
        body { font: 12px/1.5 system-ui, sans-serif; text-align: center }
        .n { font-size: 44px; font-weight: 800; letter-spacing: -1px }
      </style>
      <h1>${totemConfig.brand.name}</h1>
      <p class="n">${order.ticket}</p>
      <p>${mode === 'takeaway' ? 'PARA LEVAR' : 'COMER AQUI'}</p>
      <p>${order.referenceNumber}</p>
      <p>Total: ${(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <p>Obrigado!</p>`)
      doc.close()
      frame.contentWindow?.print()
      setTimeout(() => frame.remove(), 1000)
    },
  }
}

export function receiptPrinter(): ReceiptPrinter {
  // The ESC/POS driver lands behind totem.flags.printer when the bridge exists.
  return browserPrinter()
}

export function printReceipt(order: CompletedOrder, mode: ServiceMode): void {
  receiptPrinter().print(order, mode)
}
