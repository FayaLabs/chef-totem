import { create } from 'zustand'
import type { CustomerOffer } from '@/session/customer-lookup'

// ---------------------------------------------------------------------------
// One customer's visit, start to finish.
//
// The totem has no login and no history: every visit begins empty and ends by
// going back to `attract`. `reset()` is the single door out — the idle timeout
// (M7), the cancel button and the receipt countdown all call it, so there is
// exactly one place where a customer's data stops existing.
// ---------------------------------------------------------------------------

export type TotemStep = 'attract' | 'mode' | 'identify' | 'menu' | 'payment' | 'receipt'

/** Eat here or take it away. Chosen before the menu because it can change price. */
export type ServiceMode = 'dine_in' | 'takeaway'

export interface TotemCustomer {
  /** Digits only, as typed. Formatting is a render concern. */
  document?: string
  phone?: string
  /** Primeiro nome, quando o telefone bateu com um cliente — e só isso. Ver
   *  `customer-lookup.ts` para por que o painel não carrega mais que isso. */
  name?: string
  /** Saldo em centavos. 0 quando não há, ou quando ninguém se identificou. */
  creditCents?: number
  /** A melhor oferta do grupo a que este cliente pertence, se houver. */
  offer?: CustomerOffer | null
}

/** What the receipt screen needs, handed over by the payment screen. */
export interface CompletedOrder {
  orderId: string
  ticket: string
  referenceNumber: string
  totalCents: number
}

interface TotemSessionState {
  step: TotemStep
  mode: ServiceMode | null
  customer: TotemCustomer | null
  /** Queue number shown in the header. The real counter lands in M6. */
  ticket: string | null
  /** Bumped on every reset so effects keyed on it re-run for a fresh visit. */
  visitId: number
  placed: CompletedOrder | null

  start: () => void
  chooseMode: (mode: ServiceMode) => void
  identify: (customer: TotemCustomer | null) => void
  goTo: (step: TotemStep) => void
  completeOrder: (order: CompletedOrder) => void
  reset: () => void
}

/** Placeholder until M6 shares the counter with the counter staff. */
function provisionalTicket(): string {
  return `#${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`
}

const emptyVisit = {
  step: 'attract' as TotemStep,
  mode: null,
  customer: null,
  ticket: null,
  placed: null,
}

export const useTotemSession = create<TotemSessionState>((set, get) => ({
  ...emptyVisit,
  visitId: 0,

  start: () => set({ step: 'mode', ticket: provisionalTicket() }),

  chooseMode: (mode) => set({ mode, step: 'identify' }),

  identify: (customer) => set({ customer, step: 'menu' }),

  goTo: (step) => set({ step }),

  // The ticket is REPLACED by the one the shared sequence minted: until this
  // point it was a placeholder, and the number the customer walks away with
  // has to be the number the kitchen sees.
  completeOrder: (order) => set({ placed: order, ticket: order.ticket, step: 'receipt' }),

  reset: () => set({ ...emptyVisit, visitId: get().visitId + 1 }),
}))
