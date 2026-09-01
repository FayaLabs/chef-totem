import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Chip, Sheet, Stepper, TotemButton } from '@/design'
import { brl, lineUnitCents, useCart } from '@/cart/useCart'
import type { TotemModifier, TotemProduct } from '@/menu/types'

// Customising a dish without leaving the menu. The price recalculates as the
// customer taps, so the total is never a surprise at the till.
export function ProductSheet({
  product,
  onClose,
}: {
  product: TotemProduct | null
  onClose: () => void
}) {
  const add = useCart((s) => s.add)
  const [quantity, setQuantity] = useState(1)
  const [chosen, setChosen] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setQuantity(1)
    setChosen({})
  }, [product?.id])

  const selected: TotemModifier[] = useMemo(() => {
    if (!product) return []
    return product.modifierGroups.flatMap((group) =>
      group.modifiers.filter((modifier) => (chosen[group.id] ?? []).includes(modifier.id)),
    )
  }, [product, chosen])

  if (!product) return null

  // A required group that is not satisfied blocks the commit AND says which
  // one — a button that is simply grey teaches nothing.
  const missing = product.modifierGroups.find(
    (group) => group.required && (chosen[group.id] ?? []).length < Math.max(1, group.minSelections),
  )

  const unit = lineUnitCents(product, selected)

  const toggle = (groupId: string, modifierId: string, max: number) => {
    setChosen((current) => {
      const list = current[groupId] ?? []
      if (list.includes(modifierId)) return { ...current, [groupId]: list.filter((id) => id !== modifierId) }
      if (max === 1) return { ...current, [groupId]: [modifierId] }
      if (list.length >= max) return current
      return { ...current, [groupId]: [...list, modifierId] }
    })
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      data-testid="product-sheet"
      footer={
        <TotemButton
          tone="action"
          size="bar"
          data-testid="add-to-order"
          disabled={Boolean(missing)}
          onClick={() => {
            add(product, quantity, selected)
            onClose()
          }}
        >
          {missing ? (
            `Escolha: ${missing.name}`
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
      {product.description ? (
        <p className="text-muted" style={{ fontSize: 'var(--step-body)' }}>
          {product.description}
        </p>
      ) : null}

      <div className="mt-[4cqw] flex items-center justify-between">
        <span className="tnum font-bold text-action" style={{ fontSize: 'var(--step-title)' }}>
          {brl(unit)}
        </span>
        <Stepper value={quantity} onChange={setQuantity} data-testid="product-stepper" />
      </div>

      {product.modifierGroups.map((group) => (
        <section key={group.id} className="mt-[5cqw]">
          <h3
            className="mb-[2cqw] uppercase tracking-[0.25em] text-muted"
            style={{ fontSize: 'var(--step-label)' }}
          >
            {group.name}
            {group.required ? <span className="text-action"> · obrigatório</span> : null}
          </h3>
          <div className="grid grid-cols-2 gap-[2cqw]">
            {group.modifiers.map((modifier) => (
              <Chip
                key={modifier.id}
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
