import { deviceClient } from '@/menu/device-session'
import { totemConfig } from '@/config/totem.config'
import { brl } from '@/cart/useCart'
import type { CompletedOrder, ServiceMode } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// "Quer receber no WhatsApp?"
//
// Mesma forma dos outros drivers do painel (pagamento, reconhecimento): uma
// interface, uma implementação padrão inerte, e o lugar exato onde a de verdade
// entra. Aqui a padrão NÃO é inerte — ela enfileira uma mensagem real na caixa
// de entrada do tenant, com `delivery_status: 'queued'`.
//
// Essa distinção é o ponto todo. Enquanto o broker de WhatsApp (FAY-1423) não
// estiver ligado neste tenant, nada sai. Então a tela diz "vai chegar no seu
// WhatsApp", nunca "enviado": a primeira frase é uma promessa que o sistema
// cumpre quando o broker liga, a segunda seria mentira agora. Num totem, a
// frase errada aqui é o cliente esperando um recibo que nunca chega.
//
// O opt-out é checado no banco antes de enfileirar, e o resultado volta como
// `opted_out` — a tela agradece e não insiste.
// ---------------------------------------------------------------------------

export type DeliveryOutcome =
  | { status: 'queued'; to: string }
  | { status: 'refused'; reason: 'opted_out' | 'invalid_phone' | 'unknown_order' }
  | { status: 'failed'; message: string }

export interface ReceiptDelivery {
  readonly id: 'queue' | 'broker'
  send(input: ReceiptDeliveryInput): Promise<DeliveryOutcome>
}

export interface ReceiptDeliveryInput {
  phone: string
  order: CompletedOrder
  mode: ServiceMode
  customerName?: string | null
}

/** O texto que o cliente recebe. Curto: ele já está de pé, com a bandeja na mão. */
export function receiptMessage(input: ReceiptDeliveryInput): string {
  const where =
    input.mode === 'takeaway'
      ? 'Vamos chamar sua senha no balcão.'
      : 'Leve a senha até a mesa que a gente entrega aí.'

  return [
    input.customerName ? `Oi, ${input.customerName}!` : 'Oi!',
    `Seu pedido no ${totemConfig.brand.name} está confirmado.`,
    '',
    `Senha: ${input.order.ticket}`,
    `Total: ${brl(input.order.totalCents)}`,
    `Código: ${input.order.referenceNumber}`,
    '',
    where,
  ].join('\n')
}

const queueDelivery: ReceiptDelivery = {
  id: 'queue',
  send: async (input) => {
    try {
      const supabase = await deviceClient()
      const { data, error } = await supabase.rpc('totem_queue_receipt_whatsapp', {
        p_tenant_id: totemConfig.tenantId,
        p_phone: input.phone,
        p_order_id: input.order.orderId,
        p_body: receiptMessage(input),
        p_contact_name: input.customerName ?? null,
      })
      if (error) return { status: 'failed', message: error.message }

      const row = data as { queued?: boolean; reason?: string; to?: string } | null
      if (row?.queued) return { status: 'queued', to: String(row.to ?? input.phone) }

      const reason = row?.reason
      if (reason === 'opted_out' || reason === 'invalid_phone' || reason === 'unknown_order') {
        return { status: 'refused', reason }
      }
      return { status: 'failed', message: reason ?? 'resposta inesperada' }
    } catch (cause) {
      return { status: 'failed', message: cause instanceof Error ? cause.message : String(cause) }
    }
  },
}

/** A feira sem rede, e o CI. Mesmo caminho de tela, sem tocar no banco. */
const demoDelivery: ReceiptDelivery = {
  id: 'queue',
  send: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { status: 'queued', to: input.phone }
  },
}

export function receiptDelivery(): ReceiptDelivery {
  return import.meta.env.VITE_TOTEM_CATALOG === 'demo' ? demoDelivery : queueDelivery
}

/** (11) 9••••-1234 — confirma o número sem imprimi-lo numa tela pública. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return phone
  const ddd = digits.slice(0, 2)
  const tail = digits.slice(-4)
  return `(${ddd}) ${digits.length >= 11 ? '9' : ''}••••-${tail}`
}
