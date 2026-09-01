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
          Ir para o pagamento ·{' '}
          <span className="tnum" data-testid="cart-total">
            {brl(cartTotalCents(lines))}
          </span>
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
          className="flex items-center gap-[3cqw] border-b-2 border-hairline py-[3cqw]"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold uppercase" style={{ fontSize: 'var(--step-body)' }}>
              {line.product.name}
            </p>
            {line.modifiers.length > 0 ? (
              // The modifiers are the difference between two otherwise identical
              // lines, so they are never hidden behind a tap.
              <p className="mt-[0.5cqw] text-muted" style={{ fontSize: 'var(--step-label)' }}>
                {line.modifiers.map((m) => m.name).join(' · ')}
              </p>
            ) : null}
          </div>

          <Stepper
            value={line.quantity}
            onChange={(next) => setQuantity(line.id, next)}
            min={1}
            data-testid={`cart-stepper-${line.product.id}`}
          />

          <span
            className="tnum w-[14cqw] shrink-0 text-right font-bold"
            style={{ fontSize: 'var(--step-body)' }}
          >
            {brl(line.unitCents * line.quantity)}
          </span>

          <button
            type="button"
            aria-label={`Remover ${line.product.name}`}
            data-testid={`cart-remove-${line.product.id}`}
            onClick={() => remove(line.id)}
            className="press grid size-[var(--tap)] shrink-0 place-items-center rounded-full border-2 border-edge"
          >
            <Trash2 strokeWidth={2.5} className="size-[3cqw]" />
          </button>
        </div>
      ))}
    </Sheet>
  )
}
