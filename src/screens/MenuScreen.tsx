import { useMemo, useState } from 'react'
import { LayoutGrid, RefreshCw, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { BottomBar, Chip, TotemButton } from '@/design'
import { brl, cartCount, cartTotalCents, useCart } from '@/cart/useCart'
import { useCatalog } from '@/menu/useCatalog'
import type { TotemProduct } from '@/menu/types'
import { ProductSheet } from '@/screens/ProductSheet'
import { CartSheet } from '@/screens/CartSheet'
import { useTotemSession } from '@/session/useTotemSession'

type Filter = 'all' | 'promo' | 'featured'

// ---------------------------------------------------------------------------
// Where the customer spends 80% of their time.
//
// Category rail on the left, two-column grid on the right, commit bar pinned to
// the bottom. The top of the panel is a shop window and holds nothing tappable.
// ---------------------------------------------------------------------------

export function MenuScreen() {
  const state = useCatalog()
  const ticket = useTotemSession((s) => s.ticket)
  const reset = useTotemSession((s) => s.reset)
  const clearCart = useCart((s) => s.clear)
  const lines = useCart((s) => s.lines)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<TotemProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const products = useMemo(() => {
    if (state.status !== 'ready') return []
    return state.catalog.products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false
      if (filter === 'promo') return product.compareAtCents !== undefined
      if (filter === 'featured') return product.featured
      return true
    })
  }, [state, categoryId, filter])

  const count = cartCount(lines)

  return (
    <div data-testid="screen-menu" className="absolute inset-0 flex flex-col bg-page">
      <Header
        ticket={ticket}
        onCancel={() => {
          clearCart()
          reset()
        }}
      />

      {state.status === 'loading' ? <MenuSkeleton /> : null}
      {state.status === 'error' ? <MenuError message={state.message} onRetry={state.reload} /> : null}

      {state.status === 'ready' ? (
        <div className="flex min-h-0 flex-1">
          <nav
            data-testid="category-rail"
            className="w-[22cqw] shrink-0 overflow-y-auto border-r-2 border-hairline bg-white pb-[calc(var(--tap-bar)+4cqw)]"
          >
            <RailButton
              active={categoryId === null}
              icon={<LayoutGrid strokeWidth={2.5} className="size-[4cqw]" />}
              label="Todos"
              testId="cat-all"
              onClick={() => setCategoryId(null)}
            />
            {state.catalog.categories.map((category) => (
              <RailButton
                key={category.id}
                active={categoryId === category.id}
                icon={<UtensilsCrossed strokeWidth={2.5} className="size-[4cqw]" />}
                label={category.name}
                testId={`cat-${category.id}`}
                onClick={() => setCategoryId(category.id)}
              />
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 gap-[2cqw] px-[3cqw] py-[3cqw]">
              <Chip selected={filter === 'all'} data-testid="filter-all" onClick={() => setFilter('all')}>
                Todos
              </Chip>
              <Chip selected={filter === 'promo'} data-testid="filter-promo" onClick={() => setFilter('promo')}>
                Promo
              </Chip>
              <Chip
                selected={filter === 'featured'}
                data-testid="filter-featured"
                onClick={() => setFilter('featured')}
              >
                Em alta
              </Chip>
            </div>

            <div
              data-testid="menu-grid"
              className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-[3cqw] overflow-y-auto px-[3cqw] pb-[calc(var(--tap-bar)+4cqw)]"
            >
              {products.length === 0 ? (
                <p className="col-span-2 py-[10cqw] text-center text-muted" style={{ fontSize: 'var(--step-body)' }}>
                  Nada nesta categoria agora.
                </p>
              ) : null}
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={() => setOpen(product)} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <BottomBar>
        <TotemButton
          tone="bar-quiet"
          size="bar"
          className="flex-1"
          data-testid="open-cart"
          disabled={count === 0}
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart strokeWidth={3} className="size-[2.4cqw]" />
          Carrinho {count > 0 ? <span className="tnum">({count})</span> : null}
        </TotemButton>
        <TotemButton
          tone="action"
          size="bar"
          className="flex-[1.4]"
          data-testid="checkout"
          disabled={count === 0}
          onClick={() => setCartOpen(true)}
        >
          {count === 0 ? 'Escolha um item' : <>Finalizar · <span className="tnum">{brl(cartTotalCents(lines))}</span></>}
        </TotemButton>
      </BottomBar>

      <ProductSheet product={open} onClose={() => setOpen(null)} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}

function Header({ ticket, onCancel }: { ticket: string | null; onCancel: () => void }) {
  const now = new Date().toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <header className="relative shrink-0 bg-ink px-[4cqw] pb-[3cqw] pt-[4cqw] text-white">
      <div
        className="flex items-center justify-between uppercase tracking-[0.25em] text-white/60"
        style={{ fontSize: 'var(--step-label)' }}
      >
        <span>{now}</span>
        {ticket ? <span className="tnum">senha {ticket}</span> : null}
      </div>

      {/* A customer who changed their mind must be able to leave without
          waiting out the idle timeout in front of a queue. Secondary, so it
          may sit high; `reset` is the one door out of a visit. */}
      <button
        type="button"
        data-testid="reset"
        onClick={onCancel}
        className="press absolute right-[4cqw] top-[4cqw] rounded-full border-2 border-white/40 px-[3cqw] uppercase tracking-[0.2em] text-white/80"
        style={{ fontSize: 'var(--step-label)', minHeight: 'var(--tap)' }}
      >
        Cancelar
      </button>
      <h1
        className="mt-[2cqw] font-display uppercase leading-[0.9] tracking-tight"
        style={{ fontSize: 'var(--step-display)' }}
      >
        O que vai ser hoje?
      </h1>
    </header>
  )
}

function RailButton({
  active,
  icon,
  label,
  testId,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  testId: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'press flex min-h-[var(--tap-lg)] w-full flex-col items-center justify-center gap-[1cqw] px-[1cqw] py-[2cqw]',
        active ? 'bg-ink text-white' : 'bg-white text-ink',
      ].join(' ')}
    >
      {icon}
      <span
        className="text-center font-semibold uppercase leading-tight tracking-[0.08em]"
        style={{ fontSize: 'var(--step-label)' }}
      >
        {label}
      </span>
    </button>
  )
}

function ProductCard({ product, onOpen }: { product: TotemProduct; onOpen: () => void }) {
  // A photo URL that 404s must fall back to the icon, not leave an empty grey
  // box. On a panel whose whole pitch is the food imagery, a silently broken
  // image reads as a broken product.
  const [imageBroken, setImageBroken] = useState(false)

  return (
    <button
      type="button"
      data-testid={`product-${product.id}`}
      data-sold-out={product.soldOut ? 'true' : 'false'}
      disabled={product.soldOut}
      onClick={onOpen}
      className="press flex min-h-[34cqw] flex-col overflow-hidden rounded-totem bg-white text-left disabled:opacity-60"
    >
      <div className="relative h-[18cqw] shrink-0 bg-hairline">
        {product.imageUrl && !imageBroken ? (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            data-testid={`img-${product.id}`}
            onError={() => setImageBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted">
            <UtensilsCrossed strokeWidth={1.5} className="size-[6cqw]" />
          </div>
        )}
        {product.soldOut ? (
          // Dimmed and inert, never removed: a dish that vanishes sends the
          // customer to the counter to ask where it went.
          <span
            className="absolute inset-x-0 bottom-0 bg-ink/85 py-[1cqw] text-center uppercase tracking-[0.2em] text-white"
            style={{ fontSize: 'var(--step-label)' }}
          >
            Esgotado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between p-[2.5cqw]">
        <span className="font-bold uppercase leading-tight" style={{ fontSize: 'var(--step-body)' }}>
          {product.name}
        </span>
        <span className="mt-[1.5cqw] flex items-baseline gap-[1.5cqw]">
          <span className="tnum font-bold text-action" style={{ fontSize: 'var(--step-title)' }}>
            {brl(product.priceCents)}
          </span>
          {product.compareAtCents ? (
            <span className="tnum text-muted line-through" style={{ fontSize: 'var(--step-body)' }}>
              {brl(product.compareAtCents)}
            </span>
          ) : null}
        </span>
      </div>
    </button>
  )
}

function MenuSkeleton() {
  return (
    <div data-testid="menu-skeleton" className="flex min-h-0 flex-1 gap-[3cqw] p-[3cqw]">
      <div className="h-full w-[22cqw] shrink-0 animate-pulse rounded-totem bg-hairline" />
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-[3cqw]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[34cqw] animate-pulse rounded-totem bg-hairline" />
        ))}
      </div>
    </div>
  )
}

function MenuError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      data-testid="menu-error"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3cqw] px-[8cqw] text-center"
    >
      <h2 className="font-display uppercase" style={{ fontSize: 'var(--step-title)' }}>
        O cardápio não carregou
      </h2>
      {/* The cause is on screen on purpose: the person who can fix a kiosk is
          standing next to it, and "algo deu errado" sends them to call someone. */}
      <p className="text-muted" style={{ fontSize: 'var(--step-body)' }}>
        {message}
      </p>
      <TotemButton tone="ink" data-testid="menu-retry" onClick={onRetry}>
        <RefreshCw strokeWidth={3} className="size-[2.4cqw]" /> Tentar de novo
      </TotemButton>
    </div>
  )
}
