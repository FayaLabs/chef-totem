import {
  memoryPrinter, renderEscPos,
  type BillJob, type CustomerTicket, type EscPosOptions, type PrinterPort, type PrintJob,
  type PrintResult,
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

/**
 * The itemised copy — what was bought, at what price.
 *
 * NOT the fiscal cupom, and it says so on the paper. A DANFE NFC-e is built
 * from an AUTHORIZED XML and carries an access key SEFAZ issued; printing one
 * from what the panel believes it sold would be a fake fiscal document. When
 * NFC-e lands this becomes a `fiscal_receipt` job in the same slot.
 */
export function orderBill(order: CompletedOrder, mode: ServiceMode): BillJob {
  return {
    kind: 'bill',
    brandName: brandName(),
    reference: order.referenceNumber,
    lines: order.lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      ...(l.note ? { note: l.note } : {}),
    })),
    subtotalCents: order.totalCents,
    totalCents: order.totalCents,
    footer: `${MODE_LABEL[mode].toUpperCase()} · Este documento não é documento fiscal`,
  }
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
function browserPrinter(): TotemPrinter {
  return {
    id: 'browser-print',
    // The browser path cannot emit a strip: `window.print()` is one document,
    // and the queue number is the one that has to come out.
    printAll(jobs) {
      const ticket = jobs.find((j) => j.kind === 'customer_ticket') ?? jobs[jobs.length - 1]!
      return this.print(ticket)
    },
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

/**
 * A printer that can put several documents on ONE strip of paper.
 *
 * `PrinterPort` takes a single job, which is the right shape for a port and the
 * wrong shape for this printer: the POS80 driver appends its own FULL cut at
 * the end of every spooler job. Two jobs means two full cuts, and the first
 * ticket hits the floor before anyone can take it.
 *
 * It is an SDK gap — `PrinterPort` wants a batch primitive — but the workaround
 * belongs here, next to the driver that forces it.
 */
export interface TotemPrinter extends PrinterPort {
  printAll(jobs: PrintJob[]): Promise<PrintResult>
}

function shellPrinter(shell: FayzShellBridge): TotemPrinter {
  const send = async (jobs: PrintJob[]): Promise<PrintResult> => {
    let bytes: Uint8Array
    try {
      // Only the first document resets the printer. `ESC @` arriving after the
      // previous one's partial cut FINISHES that cut, and the ticket meant to
      // hang by a tab lands on the floor.
      const parts = jobs.map((job, i) =>
        renderEscPos(job, i === 0 ? PANEL_ESCPOS : { ...PANEL_ESCPOS, continued: true }))
      bytes = new Uint8Array(parts.reduce((n, b) => n + b.length, 0))
      let at = 0
      for (const part of parts) { bytes.set(part, at); at += part.length }
    } catch (cause) {
      // A job that cannot be rendered is a bug in the caller, and it must not
      // read to the operator as a printer that is out of paper.
      const said = cause instanceof Error ? cause.message : String(cause)
      return { ok: false, message: `Cupom não pôde ser montado: ${said}` }
    }
    return shell.printRaw(bytes)
  }
  return {
    id: 'escpos-shell',
    print: (job) => send([job]),
    printAll: (jobs) => send(jobs),
  }
}

/**
 * Which paper path this panel has.
 *
 * The shell wins whenever it is there: it is the only one that cuts, and the
 * browser path exists for the panels that are still a Chrome window.
 */
export function receiptPrinter(): TotemPrinter {
  const shell = typeof window !== 'undefined' ? window.fayzShell : undefined
  if (shell?.isShell && totemConfig.flags.printer) return shellPrinter(shell)
  return browserPrinter()
}

/** Kept for the demo catalog and the e2e suite: records instead of printing. */
export { memoryPrinter }

/**
 * Two documents, one spooler job, held together by a partial cut.
 *
 * Order matters: whoever tears the strip off ends up holding the queue number
 * face-up, which is what they show at the counter.
 */
export function printReceipt(order: CompletedOrder, mode: ServiceMode): Promise<PrintResult> {
  return receiptPrinter().printAll([orderBill(order, mode), customerTicket(order, mode)])
}
