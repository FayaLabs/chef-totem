import type { PaymentMethod } from '@/payment/driver'

// ---------------------------------------------------------------------------
// The cluster this panel sells INTO, when that cluster is ChefControl.
//
// The panel has two possible backends and they are not variants of each other:
//
//   `pool`        — the resto-saas pool, reached with the totem's own device
//                   login. Catalog, order, invoice and settlement all go
//                   through @fayz-ai/core (see orders/place-order.ts).
//   `beautyplace` — the ChefControl cluster, reached through ONE anon Edge
//                   Function door (`public-booking`) gated by a shared secret.
//                   The panel holds no session there and reads no table
//                   directly: every policy on that project is written for a
//                   guest with a phone, not for a kiosk.
//
// The secret is in the panel's .env and therefore inside the packaged bundle.
// That is the same trust level as the till it is bolted to — whoever can read
// this machine's disk can already take its money — and it is why the door it
// opens can only create a sale for ONE tenant and price it from the database.
// ---------------------------------------------------------------------------

const env = import.meta.env

export type OrderBackend = 'pool' | 'beautyplace'

export interface BeautyplaceConfig {
  /** Supabase project URL of the cluster. */
  url: string
  /** Publishable (anon) key — the Edge Function gateway still demands it. */
  anonKey: string
  /** Which house in the cluster this panel sells for. */
  tenantId: number
  /** The panel's shared secret for the totem actions. */
  totemKey: string
  /** Optional: the unit the sale belongs to. Headquarters when absent. */
  unitId?: number
  /**
   * Which row of the cluster's `payment_method_types` registry each method
   * settles as. Optional: the cluster matches by name when these are absent,
   * and a tenant's own `payment_methods` rows are a different column entirely.
   */
  paymentTypeIds: Partial<Record<PaymentMethod, number>>
  /** Optional: where the money lands, when the method does not say. */
  bankAccountId?: number
}

function text(key: string): string {
  const value = env[key as keyof ImportMetaEnv]
  return typeof value === 'string' ? value.trim() : ''
}

function number(key: string): number | undefined {
  const value = Number(text(key))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export const beautyplaceConfig: BeautyplaceConfig = {
  url: text('VITE_BP_URL'),
  anonKey: text('VITE_BP_ANON_KEY'),
  tenantId: number('VITE_BP_TENANT_ID') ?? 0,
  totemKey: text('VITE_BP_TOTEM_KEY'),
  unitId: number('VITE_BP_UNIT_ID'),
  paymentTypeIds: {
    credit: number('VITE_BP_PAYMENT_TYPE_CREDIT'),
    debit: number('VITE_BP_PAYMENT_TYPE_DEBIT'),
    pix: number('VITE_BP_PAYMENT_TYPE_PIX'),
  },
  bankAccountId: number('VITE_BP_BANK_ACCOUNT_ID'),
}

/** What the cluster backend still needs, by name, or an empty list. */
export function missingBeautyplaceConfig(): string[] {
  const need: [string, unknown][] = [
    ['VITE_BP_URL', beautyplaceConfig.url],
    ['VITE_BP_ANON_KEY', beautyplaceConfig.anonKey],
    ['VITE_BP_TENANT_ID', beautyplaceConfig.tenantId || undefined],
    ['VITE_BP_TOTEM_KEY', beautyplaceConfig.totemKey],
  ]
  return need.filter(([, value]) => !value).map(([name]) => name)
}

/**
 * Where this panel's orders go.
 *
 * Deliberately independent of which CATALOG is on the glass: the whole point of
 * the cluster backend is that a demo house can be the theatre while the sale is
 * real. A misconfigured backend falls back to the pool rather than silently
 * dropping orders — `missingBeautyplaceConfig()` is what the service panel
 * shows when that happens.
 */
export function orderBackend(): OrderBackend {
  const chosen = text('VITE_TOTEM_ORDER_BACKEND')
  if (chosen !== 'beautyplace') return 'pool'
  return missingBeautyplaceConfig().length === 0 ? 'beautyplace' : 'pool'
}

export function isBeautyplaceBackend(): boolean {
  return orderBackend() === 'beautyplace'
}
