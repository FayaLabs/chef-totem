import { useMemo, useState } from 'react'
import { Gift, RefreshCw, ShoppingCart, UtensilsCrossed, Wallet, X } from 'lucide-react'
import { allCategoriesIcon as AllIcon, categoryIcon } from '@/menu/category-icon'
import { BottomBar, Chip, Sheet, TotemButton } from '@/design'
import { brl, cartCount, cartTotalCents, useCart } from '@/cart/useCart'
import { useCatalog } from '@/menu/useCatalog'
import { useMenuUi } from '@/menu/useMenuUi'
import { useWaiter } from '@/waiter/useWaiter'
import { useProductDraft } from '@/menu/useProductDraft'
import type { TotemProduct } from '@/menu/types'
import { ProductSheet } from '@/screens/ProductSheet'
import { CartSheet } from '@/screens/CartSheet'
import { offerLabel } from '@/orders/totals'
import { useTotemSession, type TotemCustomer } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// Where the customer spends 80% of their time.
//
// Category rail on the left, two-column grid on the right, commit bar pinned to
// the bottom. The top of the panel is a shop window and holds nothing tappable.
// ---------------------------------------------------------------------------

export function MenuScreen() {
  const state = useCatalog()
  const ticket = useTotemSession((s) => s.ticket)
  const customer = useTotemSession((s) => s.customer)
  const reset = useTotemSession((s) => s.reset)
  const clearCart = useCart((s) => s.clear)
  const lines = useCart((s) => s.lines)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  // Screen state lives in stores, not in this component, so the assistant can
  // move the actual screen instead of silently editing the cart behind it.
  const categoryId = useMenuUi((s) => s.categoryId)
  const filter = useMenuUi((s) => s.filter)
  const cartOpen = useMenuUi((s) => s.cartOpen)
  const openCategory = useMenuUi((s) => s.openCategory)
  const setFilter = useMenuUi((s) => s.setFilter)
  const setCartOpen = useMenuUi((s) => s.setCartOpen)
  const resetMenuUi = useMenuUi((s) => s.reset)

  // The dock is chrome, not an overlay: when the waiter is on shift the grid
  // and the rail give up its height instead of scrolling underneath it.
  const waiterOn = useWaiter((s) => s.phase) !== 'off'
  const bottomInset = waiterOn
    ? 'calc(var(--tap-bar) + 17cqw + 4cqw)'
    : 'calc(var(--tap-bar) + 4cqw)'

  const openProductId = useProductDraft((s) => s.productId)
  const openDraft = useProductDraft((s) => s.open)
  const closeDraft = useProductDraft((s) => s.close)

  const products = useMemo(() => {
    if (state.status !== 'ready') return []
    return state.catalog.products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false
      if (filter === 'promo') return product.compareAtCents !== undefined
      if (filter === 'featured') return product.featured
      return true
    })
  }, [state, categoryId, filter])

  const openProduct = useMemo(() => {
    if (state.status !== 'ready' || !openProductId) return null
    return state.catalog.products.find((product) => product.id === openProductId) ?? null
  }, [state, openProductId])

  const count = cartCount(lines)

  // A única porta de saída da visita, e ela apaga TUDO: carrinho, estado de
  // tela, rascunho aberto e sessão. Espalhar essa limpeza por dois callbacks é
  // como se esquece de zerar uma coisa e o próximo cliente vê o pedido anterior.
  const leave = () => {
    clearCart()
    resetMenuUi()
    closeDraft()
    reset()
  }

  return (
    <div data-testid="screen-menu" className="absolute inset-0 flex flex-col bg-page">
      <Header
        ticket={ticket}
        customer={customer}
        onCancel={() => {
          if (count > 0) return setConfirmingCancel(true)
          leave()
        }}
      />

      {state.status === 'loading' ? <MenuSkeleton /> : null}
      {state.status === 'error' ? <MenuError message={state.message} onRetry={state.reload} /> : null}

      {state.status === 'ready' ? (
        <div className="flex min-h-0 flex-1">
          <nav
            data-testid="category-rail"
            className="w-[22cqw] shrink-0 overflow-y-auto border-r-2 border-hairline bg-white"
            style={{ paddingBottom: bottomInset }}
          >
            <RailButton
              active={categoryId === null}
              icon={<AllIcon strokeWidth={2.5} className="size-[4cqw]" />}
              label="Todos"
              testId="cat-all"
              onClick={() => openCategory(null)}
            />
            {state.catalog.categories.map((category) => {
              // Um ícone por categoria, deduzido do nome — ver category-icon.tsx.
              const Icon = categoryIcon(category.name)
              return (
                <RailButton
                  key={category.id}
                  active={categoryId === category.id}
                  icon={<Icon strokeWidth={2.5} className="size-[4cqw]" />}
                  label={category.name}
                  testId={`cat-${category.id}`}
                  onClick={() => openCategory(category.id)}
                />
              )
            })}
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
              className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-[3cqw] overflow-y-auto px-[3cqw]"
              style={{ paddingBottom: bottomInset }}
            >
              {products.length === 0 ? (
                <p className="col-span-2 py-[10cqw] text-center text-muted" style={{ fontSize: 'var(--step-body)' }}>
                  Nada nesta categoria agora.
                </p>
              ) : null}
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={() => openDraft(product.id)} />
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

      <ProductSheet product={openProduct} onClose={closeDraft} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
      <CancelSheet
        open={confirmingCancel}
        count={count}
        onKeep={() => setConfirmingCancel(false)}
        onDiscard={() => {
          setConfirmingCancel(false)
          leave()
        }}
      />
    </div>
  )
}

function Header({
  ticket,
  customer,
  onCancel,
}: {
  ticket: string | null
  customer: TotemCustomer | null
  onCancel: () => void
}) {
  const now = new Date().toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <header className="shrink-0 bg-ink px-[4cqw] pb-[3cqw] pt-[3cqw] text-white">
      {/* Uma linha, três coisas, nada absoluto. O cancelar era `absolute` e caía
          em cima da senha — dois textos no mesmo canto, e o que o cliente
          precisa ler (a senha dele) era o que ficava por baixo. Agora dividem a
          linha, e a régua de 88px vale para o botão sem empurrar nada. */}
      <div className="flex min-h-[var(--tap)] items-center gap-[3cqw]">
        <div
          className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-[3cqw] uppercase tracking-[0.25em] text-white/60"
          style={{ fontSize: 'var(--step-label)' }}
        >
          <span>{now}</span>
          {ticket ? (
            <span className="tnum text-white/85">
              senha <span className="font-bold">{ticket}</span>
            </span>
          ) : null}
        </div>

        {/* A customer who changed their mind must be able to leave without
            waiting out the idle timeout in front of a queue. Secondary, so it
            may sit high; `reset` is the one door out of a visit. */}
        <button
          type="button"
          data-testid="reset"
          onClick={onCancel}
          className="press flex shrink-0 items-center gap-[1.5cqw] rounded-totem border-2 border-white/30 px-[3.5cqw] uppercase tracking-[0.18em] text-white/75"
          style={{ fontSize: 'var(--step-label)', height: 'var(--tap)' }}
        >
          <X strokeWidth={3} className="size-[2.2cqw]" />
          Cancelar
        </button>
      </div>

      {/* O nome vem antes da pergunta, não no lugar dela: "Oi, Marina" é
          cortesia, "O que vai ser hoje?" é a instrução, e quem chegou agora
          precisa da segunda.

          Crédito e oferta moram aqui e não numa tela de boas-vindas que some
          sozinha: são as duas coisas que mudam o quanto a pessoa vai gastar, e
          ela tem de poder reler a qualquer momento, não em dois segundos. */}
      {customer?.name ? (
        <p
          data-testid="menu-greeting"
          className="mt-[2cqw] uppercase tracking-[0.3em] text-white/55"
          style={{ fontSize: 'var(--step-label)' }}
        >
          Oi, {customer.name}
        </p>
      ) : null}
      <h1
        className="mt-[1.5cqw] font-display uppercase leading-[0.9] tracking-tight"
        style={{ fontSize: 'var(--step-display)' }}
      >
        O que vai ser hoje?
      </h1>

      {customer && ((customer.creditCents ?? 0) > 0 || customer.offer) ? (
        <div className="mt-[2.5cqw] flex flex-wrap gap-[2cqw]">
          {(customer.creditCents ?? 0) > 0 ? (
            <Perk testId="header-credit" icon={<Wallet strokeWidth={2.5} className="size-[2.6cqw]" />}>
              {brl(customer.creditCents ?? 0)} de crédito
            </Perk>
          ) : null}
          {customer.offer ? (
            <Perk testId="header-offer" icon={<Gift strokeWidth={2.5} className="size-[2.6cqw]" />}>
              {customer.offer.title} · {offerLabel(customer.offer)}
            </Perk>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

function Perk({
  icon,
  children,
  testId,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  testId: string
}) {
  return (
    <span
      data-testid={testId}
      className="flex items-center gap-[1.5cqw] rounded-full bg-white/12 px-[3cqw] py-[1.2cqw] uppercase tracking-[0.14em] text-white/85 backdrop-blur"
      style={{ fontSize: 'var(--step-label)' }}
    >
      {icon}
      {children}
    </span>
  )
}

/**
 * Confirmar antes de jogar o pedido fora — mas só quando há pedido.
 *
 * Cancelar com o carrinho vazio é sair de uma tela; cancelar com seis itens é
 * perder cinco minutos de escolha. A mesma palavra, dois estragos diferentes,
 * então só o segundo custa um toque a mais.
 */
function CancelSheet({
  open,
  count,
  onKeep,
  onDiscard,
}: {
  open: boolean
  count: number
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <Sheet open={open} onClose={onKeep} data-testid="cancel-sheet" title="Cancelar o pedido?">
      <p className="text-muted" style={{ fontSize: 'var(--step-body)' }}>
        {count === 1 ? 'O item escolhido' : `Os ${count} itens escolhidos`} vão embora e a tela volta
        para o começo.
      </p>
      <div className="mt-[6cqw] flex flex-col gap-[2.5cqw]">
        <TotemButton tone="action" className="w-full" data-testid="cancel-keep" onClick={onKeep}>
          Continuar meu pedido
        </TotemButton>
        <TotemButton tone="ink" className="w-full" data-testid="cancel-discard" onClick={onDiscard}>
          Sim, cancelar tudo
        </TotemButton>
      </div>
    </Sheet>
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
