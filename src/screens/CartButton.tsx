import { useEffect, useState } from 'react'
import { Check, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { TotemButton } from '@/design'
import { cartCount, useCart } from '@/cart/useCart'

// ---------------------------------------------------------------------------
// O botão do carrinho, e o instante em que ele confirma.
//
// Um contador que pula de (1) para (2) é a confirmação mais fraca possível: o
// número está no canto oposto de onde o dedo acabou de tocar, e ninguém olha
// para lá. O cliente adiciona, não vê nada acontecer, e adiciona de novo — é
// assim que nasce pedido em dobro numa fila.
//
// Por um segundo e meio o botão mostra O QUE entrou, com a foto. Depois volta a
// ser o contador. A foto é o que fecha o laço com o cartão que ele tocou: ele
// reconhece o prato antes de ler qualquer palavra.
//
// Vale para o garçom também. Quando ele adiciona por conta própria, o mesmo
// flash aparece — e é a única prova, para quem falou, de que a frase virou
// item. Por isso o gatilho vive no CARRINHO (`lastAdded`) e não na tela.
// ---------------------------------------------------------------------------

const FLASH_MS = 1600

export function CartButton({ onOpen }: { onOpen: () => void }) {
  const lines = useCart((s) => s.lines)
  const lastAdded = useCart((s) => s.lastAdded)
  const [flashing, setFlashing] = useState(false)

  const count = cartCount(lines)

  // `seq` e não o nome: adicionar a mesma pizza duas vezes tem de piscar duas
  // vezes, e um objeto igual ao anterior não reinicia efeito nenhum.
  useEffect(() => {
    if (!lastAdded) return
    setFlashing(true)
    const timer = setTimeout(() => setFlashing(false), FLASH_MS)
    return () => clearTimeout(timer)
  }, [lastAdded?.seq, lastAdded])

  if (flashing && lastAdded) {
    return (
      <span
        data-testid="cart-flash"
        className="flex min-w-0 flex-1 items-center gap-[2.5cqw] overflow-hidden bg-page px-[4cqw]"
        style={{ minHeight: 'var(--tap-bar)' }}
      >
        {/* O conteúdo é que se move, não a célula: a barra tem altura fixa e
            um `overflow-hidden` em volta, então o item parece atravessá-la. */}
        <span
          className="flex min-w-0 flex-1 items-center gap-[2.5cqw] motion-safe:animate-[cart-flash_1600ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
        >
        <span className="grid size-[7cqw] shrink-0 place-items-center overflow-hidden rounded-[1.6cqw] bg-hairline">
          {lastAdded.imageUrl ? (
            <img src={lastAdded.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <UtensilsCrossed strokeWidth={2} className="size-[3.4cqw] text-muted" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span
            className="flex items-center gap-[1.2cqw] uppercase tracking-[0.25em] text-action"
            style={{ fontSize: 'var(--step-label)' }}
          >
            <Check strokeWidth={3} className="size-[2cqw]" />
            no pedido
          </span>
          <span
            className="mt-[0.4cqw] block truncate font-semibold uppercase tracking-[0.08em]"
            style={{ fontSize: 'var(--step-body)' }}
          >
            {lastAdded.name}
          </span>
        </span>
        </span>
      </span>
    )
  }

  return (
    <TotemButton
      tone="bar-quiet"
      size="bar"
      className="flex-1"
      data-testid="open-cart"
      disabled={count === 0}
      onClick={onOpen}
    >
      <ShoppingCart strokeWidth={3} className="size-[2.4cqw]" />
      Carrinho {count > 0 ? <span className="tnum">({count})</span> : null}
    </TotemButton>
  )
}
