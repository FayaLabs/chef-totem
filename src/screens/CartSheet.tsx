import { ArrowRight, Trash2 } from 'lucide-react'
import { Sheet, Stepper, TotemButton } from '@/design'
import { brl, cartTotalCents, useCart } from '@/cart/useCart'
import { useTotemSession } from '@/session/useTotemSession'

export function CartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lines = useCart((s) => s.lines)
  const setQuantity = useCart((s) => s.setQuantity)
  const remove = useCart((s) => s.remove)
  const goTo = useTotemSession((s) => s.goTo)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Seu pedido"
      data-testid="cart-sheet"
      footer={
        <TotemButton
          tone="action"
          size="bar"
          data-testid="to-payment"
          disabled={lines.length === 0}
          onClick={() => {
            onClose()
            goTo('payment')
          }}
        >
          Ir para o pagamento
          <ArrowRight strokeWidth={3} className="size-[2.4cqw]" />
        </TotemButton>
      }
    >
      {lines.length === 0 ? (
        <p className="py-[8cqw] text-center text-muted" style={{ fontSize: 'var(--step-body)' }}>
          Seu carrinho está vazio.
        </p>
      ) : null}

      {lines.map((line) => (
        <div
          key={line.id}
          data-testid={`cart-line-${line.product.id}`}
          className="flex items-center gap-[2.5cqw] border-b-2 border-hairline py-[2.5cqw]"
        >
          {/* The photo earns its place: it is how a customer confirms the line
              is the thing they chose, faster than reading the name. */}
          <div className="size-[12cqw] shrink-0 overflow-hidden rounded-[16px] bg-hairline">
            {line.product.imageUrl ? (
              <img src={line.product.imageUrl} alt="" className="size-full object-cover" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold uppercase" style={{ fontSize: 'var(--step-body)' }}>
              {line.product.name}
            </p>
            {line.modifiers.length > 0 ? (
              // The modifiers are the difference between two otherwise identical
              // lines, so they are never hidden behind a tap.
              <p className="mt-[0.5cqw] truncate text-muted" style={{ fontSize: 'var(--step-label)' }}>
                {line.modifiers.map((m) => m.name).join(' · ')}
              </p>
            ) : null}
            <p className="tnum mt-[0.5cqw] font-bold" style={{ fontSize: 'var(--step-body)' }}>
              {brl(line.unitCents * line.quantity)}
            </p>
          </div>

          <Stepper
            value={line.quantity}
            onChange={(next) => setQuantity(line.id, next)}
            min={1}
            size="sm"
            data-testid={`cart-stepper-${line.product.id}`}
          />

          <button
            type="button"
            aria-label={`Remover ${line.product.name}`}
            data-testid={`cart-remove-${line.product.id}`}
            onClick={() => remove(line.id)}
            className="press grid size-[var(--tap)] shrink-0 place-items-center rounded-full text-muted"
          >
            <Trash2 strokeWidth={2.5} className="size-[2.6cqw]" />
          </button>
        </div>
      ))}

      {lines.length > 0 ? (
        <div className="flex items-baseline justify-between pt-[4cqw]">
          <span className="uppercase tracking-[0.25em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
            Total
          </span>
          <span className="tnum font-bold" data-testid="cart-total" style={{ fontSize: 'var(--step-title)' }}>
            {brl(cartTotalCents(lines))}
          </span>
        </div>
      ) : null}

    </Sheet>
  )
}
