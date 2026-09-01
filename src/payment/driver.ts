// ---------------------------------------------------------------------------
// The card machine, as an interface.
//
// The physical terminal is bolted to the panel and arrives on Thursday, and
// which one it is (Stone / PagSeguro / Cielo / Getnet) decides how it is
// reached: a local HTTP endpoint, a native USB bridge, or an Android app the
// panel hands off to. All three fit behind this, which is the point — the
// screens that render a payment must not change when the answer arrives.
//
// Amounts are integer CENTS everywhere. Floating point money in a payment path
// is how a customer gets charged R$ 76,00000000001.
// ---------------------------------------------------------------------------

export type PaymentMethod = 'card' | 'pix' | 'cash'

export type PaymentStatus =
  | 'idle'
  | 'awaiting_card'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'timeout'

export interface ChargeRequest {
  amountCents: number
  method: PaymentMethod
  /** The totem's own reference, so a retry is recognisable as the same sale. */
  orderRef: string
}

export interface ChargeResult {
  status: PaymentStatus
  /** Acquirer authorisation code, when approved. */
  authCode?: string
  /** Card brand as the terminal reported it. */
  brand?: string
  /** NSU / terminal transaction id — what a chargeback is looked up by. */
  nsu?: string
  installments?: number
  /** For a Pix charge: the copy-and-paste payload the QR encodes. */
  pixPayload?: string
  /** Present on every unhappy path, and written for a customer to read. */
  message?: string
}

export interface PaymentTerminalDriver {
  readonly id: string
  charge(request: ChargeRequest, onStatus: (status: PaymentStatus) => void): Promise<ChargeResult>
  cancel(): Promise<void>
  getStatus(): PaymentStatus
}
