import { Plus } from 'lucide-react'
import { Chip, Sheet, Stepper, TotemButton } from '@/design'
import { brl, useCart } from '@/cart/useCart'
import {
  draftBlocking,
  draftModifiers,
  draftUnitCents,
  useProductDraft,
} from '@/menu/useProductDraft'
import type { TotemProduct } from '@/menu/types'

// Customising a dish without leaving the menu. The price recalculates as the
// customer taps, so the total is never a surprise at the till.
//
// A pure renderer over `useProductDraft`: everything it shows, the assistant
// can also set — which is what lets a spoken "sem cebola" light the chip up.
export function ProductSheet({ product, onClose }: { product: TotemProduct | null; onClose: () => void }) {
  const add = useCart((s) => s.add)
  const quantity = useProductDraft((s) => s.quantity)
  const chosen = useProductDraft((s) => s.chosen)
  const setQuantity = useProductDraft((s) => s.setQuantity)
  const toggle = useProductDraft((s) => s.toggle)

  if (!product) return null

  // A required group that is not satisfied blocks the commit AND says which
  // one — a button that is simply grey teaches nothing.
  const missing = draftBlocking(product, chosen)
  const unit = draftUnitCents(product, chosen)

  return (
    <Sheet
      open
      onClose={onClose}
      bleed
      data-testid="product-sheet"
      footer={
        <TotemButton
          tone="action"
          size="bar"
          data-testid="add-to-order"
          disabled={Boolean(missing)}
          onClick={() => {
            add(product, quantity, draftModifiers(product, chosen))
            onClose()
          }}
        >
          {missing ? (
            `Escolha: ${missing.groupName}`
          ) : (
            <>
              <Plus strokeWidth={3} className="size-[2.4cqw]" /> Adicionar ·{' '}
              <span className="tnum" data-testid="sheet-total">
                {brl(unit * quantity)}
              </span>
            </>
          )}
        </TotemButton>
      }
    >
      {/* A foto SANGRA até a borda, e o nome vem depois dela.
          Antes o nome ficava acima de uma foto com 6cqw de branco em volta —
          isso é um cartão de catálogo. Sangrada, a foto é o prato, e o nome
          embaixo lê como legenda de quem já está olhando. Numa tela de 27" a
          foto é metade do argumento de venda; emoldurá-la é jogar essa metade
          fora. */}
      {product.imageUrl ? (
        <div className="h-[42cqw] bg-hairline">
          <img src={product.imageUrl} alt="" className="size-full object-cover" data-testid="sheet-image" />
        </div>
      ) : null}

      <div className="px-[6cqw] pt-[4cqw]">
        <h2
          className="font-display uppercase leading-[0.95] tracking-tight"
          style={{ fontSize: 'var(--step-title)' }}
        >
          {product.name}
        </h2>

        {product.description ? (
          <p className="mt-[1.5cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>
            {product.description}
          </p>
        ) : null}

        <div className="mt-[4cqw] flex items-center justify-between">
          <span className="tnum font-bold text-action" style={{ fontSize: 'var(--step-title)' }}>
            {brl(unit)}
          </span>
          <Stepper value={quantity} onChange={setQuantity} data-testid="product-stepper" />
        </div>
      </div>

      {product.modifierGroups.map((group) => (
        <section key={group.id} className="mt-[4cqw] px-[6cqw]">
          <h3
            className="mb-[2cqw] uppercase tracking-[0.25em] text-muted"
            style={{ fontSize: 'var(--step-label)' }}
          >
            {group.name}
            {group.required ? <span className="text-action"> · obrigatório</span> : null}
          </h3>
          {/* Three to a row: a five-option group used to be a scroll. */}
          <div className="grid grid-cols-3 gap-[1.5cqw]">
            {group.modifiers.map((modifier) => (
              <Chip
                key={modifier.id}
                compact
                data-testid={`mod-${modifier.id}`}
                selected={(chosen[group.id] ?? []).includes(modifier.id)}
                surchargeCents={modifier.surchargeCents || undefined}
                onClick={() => toggle(group.id, modifier.id, group.maxSelections)}
              >
                {modifier.name}
              </Chip>
            ))}
          </div>
        </section>
      ))}
    </Sheet>
  )
}
