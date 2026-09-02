import { deviceClient } from '@/menu/device-session'
import { totemConfig } from '@/config/totem.config'

// ---------------------------------------------------------------------------
// Quem é a pessoa que digitou o telefone — e SÓ isso.
//
// O aparelho não tem SELECT em clientes. Ele chama `totem_customer_lookup`, uma
// função que devolve três coisas: primeiro nome, crédito, oferta. Sem e-mail,
// sem documento, sem sobrenome, sem histórico de pedidos. A projeção é estreita
// de propósito — ver `supabase/migrations/20260902090000_*.sql` para o porquê.
//
// Um telefone desconhecido e um telefone inválido devolvem exatamente a mesma
// coisa (`found: false`). O painel nunca diz "esse número não é cliente": isso
// transformaria o teclado num oráculo de quais números existem na base.
// ---------------------------------------------------------------------------

/** Um desconto que pertence a um grupo de clientes. `value` já veio do banco. */
export interface CustomerOffer {
  code: string | null
  title: string
  /** `percentage` | `fixed` — como o valor é lido. */
  method: string
  type: string
  value: number
  minSubtotalCents: number
}

export interface RecognisedCustomer {
  firstName: string | null
  creditCents: number
  offer: CustomerOffer | null
}

export type LookupOutcome =
  | { status: 'found'; customer: RecognisedCustomer }
  | { status: 'unknown' }
  /** A busca falhou. O fluxo NUNCA para por isso — ver `IdentifyScreen`. */
  | { status: 'unavailable'; message: string }

export interface CustomerLookup {
  readonly id: 'supabase' | 'demo'
  byPhone(phone: string): Promise<LookupOutcome>
}

const supabaseLookup: CustomerLookup = {
  id: 'supabase',
  byPhone: async (phone) => {
    try {
      const supabase = await deviceClient()
      const { data, error } = await supabase.rpc('totem_customer_lookup', {
        p_tenant_id: totemConfig.tenantId,
        p_phone: phone,
      })
      if (error) return { status: 'unavailable', message: error.message }

      const row = data as
        | { found?: boolean; first_name?: string | null; credit_cents?: number; offer?: unknown }
        | null
      if (!row?.found) return { status: 'unknown' }

      const raw = row.offer as Record<string, unknown> | null
      return {
        status: 'found',
        customer: {
          firstName: row.first_name ?? null,
          creditCents: Number(row.credit_cents ?? 0),
          offer: raw
            ? {
                code: (raw.code as string | null) ?? null,
                title: String(raw.title ?? 'Oferta'),
                method: String(raw.method ?? 'percentage'),
                type: String(raw.type ?? 'order'),
                value: Number(raw.value ?? 0),
                minSubtotalCents: Number(raw.min_subtotal_cents ?? 0),
              }
            : null,
        },
      }
    } catch (cause) {
      return { status: 'unavailable', message: cause instanceof Error ? cause.message : String(cause) }
    }
  },
}

/**
 * O cliente da feira. Existe pelo mesmo motivo que `demo-catalog`: o painel tem
 * de saber demonstrar o fluxo inteiro num estande sem rede. Nunca é fallback —
 * só entra com `VITE_TOTEM_CATALOG=demo`, a mesma chave do cardápio, porque um
 * cardápio de mentira com clientes de verdade não faz sentido nenhum.
 */
const demoLookup: CustomerLookup = {
  id: 'demo',
  byPhone: async (phone) => {
    await new Promise((resolve) => setTimeout(resolve, 420))
    const digits = phone.replace(/\D/g, '')
    if (digits.endsWith('1111')) {
      return {
        status: 'found',
        customer: {
          firstName: 'Marina',
          creditCents: 1800,
          offer: {
            code: 'CLUBE10',
            title: 'Clube Chef',
            method: 'percentage',
            type: 'order',
            value: 10,
            minSubtotalCents: 3000,
          },
        },
      }
    }
    if (digits.endsWith('2222')) {
      return { status: 'found', customer: { firstName: 'Rafael', creditCents: 0, offer: null } }
    }
    return { status: 'unknown' }
  },
}

export function customerLookup(): CustomerLookup {
  return import.meta.env.VITE_TOTEM_CATALOG === 'demo' ? demoLookup : supabaseLookup
}
