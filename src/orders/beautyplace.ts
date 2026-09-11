import { beautyplaceConfig } from '@/config/beautyplace.config'
import { totemConfig } from '@/config/totem.config'
import { DEMO_TENANTS } from '@/demo/tenants'
import { pizzaName } from '@/pizza/composition'
import type { CartLine } from '@/cart/useCart'
import type { PlacedOrder, PlaceOrderInput } from '@/orders/place-order'
import type { SoldLine } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// The kiosk sale, written into the ChefControl cluster.
//
// One door, one round trip: `public-booking` opens a BALCÃO comanda, prices
// every line from the cluster's own catalog, enqueues the kitchen ticket, takes
// the payment the terminal already approved and closes the comanda into a
// fatura. The panel never writes a table directly — it holds no session there.
//
// Prices are NOT sent. They are resolved from `products.sale_price` and
// `product_option_items.additional_price` on the server, and the panel reports
// only what it charged so the cluster can refuse to close a comanda whose total
// disagrees with the customer's receipt. That check is the reason the seed is
// generated from the same document the glass renders (see
// `scripts/gen-beautyplace-seed.mjs`): the two catalogs cannot drift silently.
// ---------------------------------------------------------------------------

interface RemoteOptionItem {
  id: number
  name: string
  surchargeCents: number
}

interface RemoteOptionGroup {
  id: number
  name: string
  items: RemoteOptionItem[]
}

interface RemoteProduct {
  internalCode: string
  id: number
  name: string
  priceCents: number
  groups: RemoteOptionGroup[]
}

export interface BeautyplaceCatalog {
  /** Keyed by the panel's own product id, which the seed stored as internal_code. */
  byInternalCode: Map<string, RemoteProduct>
  /** Products the panel can sell that the cluster does not know about. */
  missing: string[]
  /** Products whose cluster price is not the price on the glass. */
  mismatched: { internalCode: string; panelCents: number; clusterCents: number }[]
}

export class BeautyplaceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BeautyplaceError'
  }
}

async function call<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${beautyplaceConfig.url}/functions/v1/public-booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: beautyplaceConfig.anonKey,
      Authorization: `Bearer ${beautyplaceConfig.anonKey}`,
      'x-totem-key': beautyplaceConfig.totemKey,
    },
    body: JSON.stringify({ action, tenantId: beautyplaceConfig.tenantId, ...payload }),
  })

  const body = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) {
    throw new BeautyplaceError(body?.error ?? `HTTP ${response.status}`)
  }
  return body as T
}

/** Every product id the three houses can sell, which is what the seed covers. */
function panelProductIds(): string[] {
  const ids = new Set<string>()
  for (const house of Object.values(DEMO_TENANTS)) {
    for (const product of house.catalog.products) ids.add(product.id)
  }
  return [...ids]
}

/** The price the glass shows for a product id, or undefined if it sells none. */
function panelPriceCents(internalCode: string): number | undefined {
  for (const house of Object.values(DEMO_TENANTS)) {
    const product = house.catalog.products.find((candidate) => candidate.id === internalCode)
    if (product) return product.priceCents
  }
  return undefined
}

let catalogPromise: Promise<BeautyplaceCatalog> | null = null

/**
 * The cluster's ids for the panel's catalog, fetched once per boot.
 *
 * Resolved at boot and not per order on purpose: a panel that discovers at
 * payment time that the cluster never heard of its burgers has already taken
 * the money. The service panel reads `missing` and `mismatched` so the mismatch
 * is visible BEFORE a queue forms.
 */
export function beautyplaceCatalog(force = false): Promise<BeautyplaceCatalog> {
  if (force) catalogPromise = null
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const internalCodes = panelProductIds()
      const remote = await call<{ products: RemoteProduct[] }>('totem-catalog', { internalCodes })
      const byInternalCode = new Map<string, RemoteProduct>()
      for (const product of remote.products ?? []) byInternalCode.set(product.internalCode, product)

      const missing = internalCodes.filter((code) => !byInternalCode.has(code))
      const mismatched: BeautyplaceCatalog['mismatched'] = []
      for (const [code, product] of byInternalCode) {
        const panelCents = panelPriceCents(code)
        if (panelCents != null && panelCents !== product.priceCents) {
          mismatched.push({ internalCode: code, panelCents, clusterCents: product.priceCents })
        }
      }
      return { byInternalCode, missing, mismatched }
    })().catch((cause) => {
      catalogPromise = null
      throw cause
    })
  }
  return catalogPromise
}

interface RemoteLine {
  productId: number
  quantity: number
  notes?: string
  selectedOptions: { groupId: number; itemId: number; quantity: number }[]
}

/**
 * A cart line in the cluster's words.
 *
 * Modifiers are matched by NAME inside the product's own groups, because the
 * cluster's option items carry no code of their own. The seed writes those
 * names verbatim from the same house document, so a match is an identity, not a
 * guess — and anything that fails to match is refused rather than silently
 * dropped, which would be a burger the customer paid for and never gets.
 */
function toRemoteLine(line: CartLine, catalog: BeautyplaceCatalog): RemoteLine {
  const product = catalog.byInternalCode.get(line.product.id)
  if (!product) throw new BeautyplaceError(`product_not_in_cluster: ${line.product.id}`)

  const selectedOptions: RemoteLine['selectedOptions'] = []
  for (const modifier of line.modifiers) {
    const group = line.product.modifierGroups?.find((candidate) =>
      candidate.modifiers.some((option) => option.id === modifier.id))
    const remoteGroup = group
      ? product.groups.find((candidate) => candidate.name === group.name)
      : undefined
    const remoteItem = remoteGroup?.items.find((item) => item.name === modifier.name)
    if (!remoteGroup || !remoteItem) {
      throw new BeautyplaceError(`option_not_in_cluster: ${line.product.id} / ${modifier.name}`)
    }
    selectedOptions.push({ groupId: remoteGroup.id, itemId: remoteItem.id, quantity: 1 })
  }

  return {
    productId: product.id,
    quantity: line.quantity,
    // The composed name is what the kitchen reads first on a half-and-half
    // pizza; the options below spell out the rest.
    ...(line.pizza ? { notes: pizzaName(line.pizza) } : {}),
    selectedOptions,
  }
}

const asSold = (line: CartLine): SoldLine => ({
  name: line.pizza ? pizzaName(line.pizza) : line.product.name,
  quantity: line.quantity,
  unitPriceCents: line.unitCents,
  ...(line.modifiers.length ? { note: line.modifiers.map((m) => m.name).join(' · ') } : {}),
})

interface TotemOrderResponse {
  orderId: number
  orderNumber: number | null
  invoiceId: number | null
  paidAmount: number
  settlementError?: string
}

export async function placeBeautyplaceOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  const catalog = await beautyplaceCatalog()
  const lines = input.lines.map((line) => toRemoteLine(line, catalog))

  const subtotalCents = input.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)
  const totals = input.totals ?? {
    subtotalCents,
    offerCents: 0,
    creditCents: 0,
    totalCents: subtotalCents,
  }

  // One key per approved charge: a double tap on the receipt screen must return
  // the SAME comanda, not open a second one the kitchen would cook twice.
  const idempotencyKey = `${totemConfig.totemId}:${input.payment.nsu ?? input.payment.authCode ?? Date.now()}`

  const placed = await call<TotemOrderResponse>('submit-totem-order', {
    totemId: totemConfig.totemId,
    serviceMode: input.mode,
    ...(beautyplaceConfig.unitId ? { unitId: beautyplaceConfig.unitId } : {}),
    idempotencyKey,
    customer: input.customer
      ? {
          ...(input.customer.name ? { name: input.customer.name } : {}),
          ...(input.customer.phone ? { phone: input.customer.phone } : {}),
        }
      : undefined,
    items: lines,
    // Offer and credit are a discount on the comanda, not a cheaper dish: the
    // lines keep their catalog price and what was given away stays legible.
    discountCents: totals.offerCents + totals.creditCents,
    payment: {
      method: input.method,
      amountCents: totals.totalCents,
      brand: input.payment.brand ?? null,
      installments: input.payment.installments ?? 1,
      ...(beautyplaceConfig.paymentTypeIds[input.method]
        ? { paymentMethodTypeId: beautyplaceConfig.paymentTypeIds[input.method] }
        : {}),
      ...(beautyplaceConfig.bankAccountId ? { bankAccountId: beautyplaceConfig.bankAccountId } : {}),
    },
  })

  const ticketSource = placed.orderNumber ?? placed.orderId
  const ticket = `#${String(ticketSource % 1000).padStart(3, '0')}`

  return {
    orderId: String(placed.orderId),
    ticket,
    lines: input.lines.map(asSold),
    // The fatura number when the projection already ran, and the comanda number
    // until then — either way a number the counter can look the sale up by.
    referenceNumber: placed.invoiceId
      ? String(placed.invoiceId)
      : `COMANDA-${String(ticketSource).padStart(6, '0')}`,
    totalCents: totals.totalCents,
    // The money is taken and the comanda is closed the moment the settlement
    // succeeds. The fatura is projected asynchronously by the cluster's
    // financial worker, so an absent invoice id is NOT an unpaid sale — reading
    // it that way told a paying customer to go and see the caixa.
    paid: !placed.settlementError,
    // Customer-facing copy: the sale exists and the kitchen has it, but the
    // till still has to close it, and only the caixa can.
    ...(placed.settlementError
      ? { warning: `Pedido enviado para a cozinha. O pagamento precisa ser confirmado no caixa — mostre a senha ${ticket}.` }
      : {}),
  }
}
