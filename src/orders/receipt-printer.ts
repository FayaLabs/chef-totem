import {
  memoryPrinter, renderEscPos,
  type CustomerTicket, type EscPosOptions, type PrinterPort, type PrintJob, type PrintResult,
} from '@fayz-ai/core/printing'
import { totemConfig } from '@/config/totem.config'
import type { CompletedOrder, ServiceMode } from '@/session/useTotemSession'
import { brandName } from '@/config/tenant-brand'

// ---------------------------------------------------------------------------
// Paper.
//
// What the totem prints is a `PrintJob` — a structured document. HOW it reaches
// paper is the adapter's problem, and the adapter is chosen by what is bolted
// to this panel, which is a fact about the hardware and not about this file.
//
// That split is why nothing here changes when the printer is finally known:
// `browserPrint` renders the same job to HTML, an ESC/POS adapter renders it to
// bytes with `renderEscPos`, and `ReceiptScreen` never learns the difference.
//
// The fiscal cupom (DANFE NFC-e) is the same seam: a `fiscal_receipt` job built
// from the AUTHORIZED XML, printed by whichever adapter is installed. It waits
// on the NFC-e contract, not on anything in this file.
// ---------------------------------------------------------------------------

const MODE_LABEL: Record<ServiceMode, string> = {
  dine_in: 'comer aqui',
  takeaway: 'para levar',
}

/** The sale, as a document. The only totem-specific knowledge in this module. */
export function customerTicket(order: CompletedOrder, mode: ServiceMode): CustomerTicket {
  return {
    kind: 'customer_ticket',
    brandName: brandName(),
    ticket: order.ticket,
    serviceMode: MODE_LABEL[mode],
    reference: order.referenceNumber,
    totalCents: order.totalCents,
    paid: order.paid,
    footer: 'Obrigado!',
  }
}

/**
 * The browser's own print path: the panel's printer is installed in the OS and
 * `window.print()` reaches it. Crude — it rasterises, it needs a driver, and it
 * cannot cut or kick a drawer — but it needs nothing installed and it is what
 * runs today.
 */
function browserPrinter(): PrinterPort {
  return {
    id: 'browser-print',
    async print(job: PrintJob): Promise<PrintResult> {
      if (job.kind !== 'customer_ticket') {
        return { ok: false, message: 'Esta impressora só imprime a senha do cliente.' }
      }
      const frame = document.createElement('iframe')
      // Printing the panel itself would put the whole kiosk UI on the paper.
      frame.style.position = 'fixed'
      frame.style.inset = '-9999px auto auto -9999px'
      document.body.append(frame)

      const doc = frame.contentDocument
      if (!doc) return { ok: false, message: 'O navegador não abriu a janela de impressão.' }
      doc.write(`<!doctype html><meta charset="utf-8"><style>
        @page { size: 80mm auto; margin: 4mm }
        body { font: 12px/1.5 system-ui, sans-serif; text-align: center }
        .n { font-size: 44px; font-weight: 800; letter-spacing: -1px }
      </style>
      <h1>${job.brandName}</h1>
      <p class="n">${job.ticket}</p>
      <p>${job.serviceMode.toUpperCase()}</p>
      <p>${job.reference}</p>
      <p>Total: ${(job.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      ${job.paid ? '' : '<p><b>PENDENTE — PASSE NO CAIXA</b></p>'}
      <p>${job.footer ?? ''}</p>`)
      doc.close()
      frame.contentWindow?.print()
      setTimeout(() => frame.remove(), 1000)
      return { ok: true }
    },
  }
}

/**
 * ESC/POS through the shell, which reaches the Win32 spooler in RAW mode.
 *
 * The settings below are not defaults — they are what the panel's Masung POS80
 * answered to when swept over SSH:
 *
 *   CP860       of twelve `ESC t` indices, only n=3 rendered `ração` correctly
 *   raster QR   every `GS ( k` variant printed nothing and reported no error,
 *               while `GS k` (barcode) and `GS v 0` (raster) both worked
 *   384 dots    the width proved on this panel's paper
 *
 * A different printer may want different values; they belong in the tenant's
 * terminal config the day a second model appears, not hard-coded deeper.
 */
const PANEL_ESCPOS: EscPosOptions = { codepage: 'cp860', dots: 384, qrModuleScale: 5 }

function shellPrinter(shell: FayzShellBridge): PrinterPort {
  return {
    id: 'escpos-shell',
    async print(job: PrintJob): Promise<PrintResult> {
      let bytes: Uint8Array
      try {
        bytes = renderEscPos(job, PANEL_ESCPOS)
      } catch (cause) {
        // A job that cannot be rendered is a bug in the caller, and it must not
        // read to the operator as a printer that is out of paper.
        const said = cause instanceof Error ? cause.message : String(cause)
        return { ok: false, message: `Cupom não pôde ser montado: ${said}` }
      }
      return shell.printRaw(bytes)
    },
  }
}

/**
 * Which paper path this panel has.
 *
 * The shell wins whenever it is there: it is the only one that cuts, and the
 * browser path exists for the panels that are still a Chrome window.
 */
export function receiptPrinter(): PrinterPort {
  const shell = typeof window !== 'undefined' ? window.fayzShell : undefined
  if (shell?.isShell && totemConfig.flags.printer) return shellPrinter(shell)
  return browserPrinter()
}

/** Kept for the demo catalog and the e2e suite: records instead of printing. */
export { memoryPrinter }

export function printReceipt(order: CompletedOrder, mode: ServiceMode): Promise<PrintResult> {
  return receiptPrinter().print(customerTicket(order, mode))
}
