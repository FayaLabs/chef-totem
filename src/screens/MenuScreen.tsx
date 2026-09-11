import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Gift, RefreshCw, UtensilsCrossed, Wallet, X } from 'lucide-react'
import { allCategoriesIcon as AllIcon, categoryIcon } from '@/menu/category-icon'
import { BottomBar, Chip, Sheet, TotemButton } from '@/design'
import { brl, cartCount, cartTotalCents, useCart } from '@/cart/useCart'
import { useCatalog } from '@/menu/useCatalog'
import { useMenuUi } from '@/menu/useMenuUi'
import { useWaiter } from '@/waiter/useWaiter'
import { useWaiterDockInset } from '@/waiter/presence'
import { useProductDraft } from '@/menu/useProductDraft'
import type { TotemProduct } from '@/menu/types'
import { ProductSheet } from '@/screens/ProductSheet'
import { CartSheet } from '@/screens/CartSheet'
import { CartButton } from '@/screens/CartButton'
import { offerLabel } from '@/orders/totals'
import { useTotemSession, type TotemCustomer } from '@/session/useTotemSession'
import { totemConfig } from '@/config/totem.config'
import { useTenantBrand } from '@/config/tenant-brand'
import { PizzaCartArrival } from '@/pizza/PizzaCartArrival'
import { BurgerStill } from '@/burger/BurgerStill'
import { burgerLayers } from '@/burger/composition'
import { BurgerCartArrival } from '@/burger/BurgerCartArrival'

// ---------------------------------------------------------------------------
// Where the customer spends 80% of their time.
//
// Category rail on the left, two-column grid on the right, commit bar pinned to
// the bottom. The top of the panel is a shop window and holds nothing tappable.
// ---------------------------------------------------------------------------

/** Quanto tempo o garçom fica apontando para um prato. */
const HIGHLIGHT_MS = 7_000

export function MenuScreen() {
  const state = useCatalog()
  const customer = useTotemSession((s) => s.customer)
  const visitId = useTotemSession((s) => s.visitId)
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
  // and the rail give up its height instead of scrolling underneath it. A
  // altura vem de `presence`, o mesmo lugar que decide se a faixa existe.
  const dock = useWaiterDockInset()
  const bottomInset = `calc(var(--tap-bar) + ${dock} + 4cqw)`

  const highlightId = useMenuUi((s) => s.highlightId)
  const highlight = useMenuUi((s) => s.highlight)
  const openProductId = useProductDraft((s) => s.productId)
  const openDraft = useProductDraft((s) => s.open)
  const closeDraft = useProductDraft((s) => s.close)
  const availablePizzas = state.status === 'ready' ? state.catalog.products.filter((p) => p.pizza && !p.soldOut) : []
  const introPizza = availablePizzas.find((p) => p.pizza?.defaultForAssembly) ?? availablePizzas[0]
  const introBurger = state.status === 'ready' ? state.catalog.products.find((p) => p.burger?.defaultForAssembly && !p.soldOut) : undefined

  useLayoutEffect(() => {
    if (!introBurger || useMenuUi.getState().burgerIntroVisit === visitId) return
    useMenuUi.setState({ burgerIntroVisit: visitId })
    if (useProductDraft.getState().productId || useCart.getState().lines.length) return
    openDraft(introBurger.id, false, false, true)
  }, [introBurger, visitId, openDraft])

  useLayoutEffect(() => {
    if (!introPizza || useMenuUi.getState().pizzaIntroVisit === visitId) return
    useMenuUi.setState({ pizzaIntroVisit: visitId })
    // A voice-opened draft or a return to a populated order takes precedence.
    if (useProductDraft.getState().productId || useCart.getState().lines.length) return
    openDraft(introPizza.id, true, true)
  }, [introPizza, visitId, openDraft])

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

  // O destaque apaga sozinho. Ele é atenção, não seleção: deixado aceso, vira
  // um prato "escolhido" que o cliente nunca escolheu, e ele passa a olhar a
  // grade inteira apagada sem entender por quê.
  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => highlight(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlightId, highlight])

  const count = cartCount(lines)

  // A ALTURA DO CABEÇALHO, medida e não constante.
  //
  // Ele agora FLUTUA sobre o cardápio (ver Header), e o que flutua tem de
  // reservar o próprio espaço embaixo — é a mesma lição que criou a BottomBar:
  // num painel cujo meio rola, um elemento flutuante sempre acaba em cima de
  // alguma coisa. Uma constante não serve porque a faixa cresce com o que o
  // cliente trouxe: sem nome e sem crédito ela tem uma altura, com "Oi, Marina"
  // e dois selos de vantagem tem outra, e a diferença é uma linha inteira de
  // produto escondida atrás da senha.
  const header = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  useEffect(() => {
    const node = header.current
    if (!node) return
    // `borderBoxSize` e NÃO `contentRect`: o `contentRect` do observador é a
    // caixa de CONTEÚDO, sem o padding — e esta faixa tem quase um alvo de
    // toque de padding no topo. A reserva saía menor que a faixa, e o primeiro
    // item da trilha ("Todos", que é o que mostra o cardápio inteiro) nascia
    // escondido atrás dela. Um filtro que não dá para ver é um filtro que o
    // cliente acha que não existe.
    const measure = (entry?: ResizeObserverEntry) =>
      setHeaderHeight(entry?.borderBoxSize?.[0]?.blockSize ?? node.getBoundingClientRect().height)
    const observer = new ResizeObserver(([entry]) => measure(entry))
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [state.status])
  const topInset = `${headerHeight}px`

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
    <div data-testid="screen-menu" className="absolute inset-0 flex flex-col surface-page">
      <Header
        ref={header}
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
            // A trilha é uma pane inteira, e as categorias são recortes nela.
            // Eram botões brancos sobre um fundo branco: cinco retângulos sem
            // limite entre si, e a categoria ativa era a única coisa da coluna
            // que existia. Sobre vidro, a inativa é o próprio material e a
            // ativa é a única peça sólida — a hierarquia sai de graça.
            className="glass w-[22cqw] shrink-0 overflow-y-auto border-r-2 border-hairline [&::after]:hidden"
            style={{ paddingTop: topInset, paddingBottom: bottomInset }}
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
            <div className="flex shrink-0 gap-[2cqw] px-[3cqw] py-[3cqw]" style={{ marginTop: topInset }}>
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
                <ProductCard
                  key={product.id}
                  product={product}
                  highlighted={product.id === highlightId}
                  dimmed={highlightId !== null && product.id !== highlightId}
                  onOpen={() => openDraft(product.id, Boolean(product.pizza))}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <BottomBar>
        <CartButton onOpen={() => setCartOpen(true)} />
        <TotemButton
          tone="action"
          size="bar"
          className="flex-[1.4]"
          data-testid="checkout"
          disabled={count === 0}
          onClick={() => setCartOpen(true)}
        >
          {count === 0 ? totemConfig.copy.emptyCta : <>Finalizar · <span className="tnum">{brl(cartTotalCents(lines))}</span></>}
        </TotemButton>
      </BottomBar>

      <ProductSheet product={openProduct} onClose={closeDraft} />
      <PizzaCartArrival />
      <BurgerCartArrival />
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

/**
 * A marca da casa no cardápio.
 *
 * O repouso mostra a logo grande e o cliente atravessa DUAS telas até chegar
 * aqui — tempo suficiente para a pergunta "é do restaurante certo que estou
 * pedindo?" voltar, e num totem de feira, com três painéis lado a lado, ela
 * volta mesmo. A logo no topo responde sem cobrar uma linha de texto.
 *
 * PEQUENA e na linha da senha, não ao lado do título: o título já é a voz da
 * casa ("Monta o seu"), e marca duas vezes na mesma tela é a segunda sempre
 * contradizendo a primeira — a mesma regra da tela de repouso.
 *
 * Sem logo, nada: o nome tipografado aqui competiria com o título logo abaixo.
 */
function BrandMark() {
  const { theme } = totemConfig
  const name = useTenantBrand()
  const [broken, setBroken] = useState(false)
  if (!theme?.logoUrl || broken) return null
  return (
    <img
      src={theme.logoUrl}
      alt={name}
      data-testid="header-logo"
      onError={() => setBroken(true)}
      className="block shrink-0"
      // Altura travada e largura livre: as logos das casas vão de emblema
      // quadrado a wordmark deitado, e é a altura que tem de bater com a linha
      // da senha para as duas lerem como uma coisa só.
      style={{ height: '9cqw', width: 'auto', maxWidth: '34cqw', objectFit: 'contain' }}
    />
  )
}

const Header = forwardRef<HTMLElement, {
  customer: TotemCustomer | null
  onCancel: () => void
}>(function Header({ customer, onCancel }, ref) {
  return (
    // O CABEÇALHO FLUTUA, e é vidro escuro.
    //
    // Cromo flutua, compromisso é opaco. Esta faixa EMOLDURA o cardápio, e ver
    // a grade continuar por baixo dela enquanto o cliente rola é informação:
    // diz que a lista não acabou ali. A barra de baixo é o contrário — ela TIRA
    // o cliente do cardápio, e ali a única coisa que importa é o próprio botão
    // (ver design/BottomBar.tsx).
    //
    // Escuro e denso, e isso não é gosto. O texto é branco, as três páginas são
    // claras, e o que passa por baixo é foto de comida — na lanchonete, chapa
    // de aço com brilho especular, que é o pior fundo das três casas. Um vidro
    // claro derrubaria o branco abaixo de AA no primeiro prato que passasse; o
    // `glass-chrome` fica ACIMA do piso de propósito, para o fundo insinuar sem
    // invadir. Medido em pixel nas três casas: ver .evidence/glass-contrast.mjs.
    <header
      ref={ref}
      className="glass-chrome absolute inset-x-0 top-0 z-20 px-[4cqw] pb-[3cqw] pt-[3cqw]"
    >
      {/* O alvo da etiqueta de serviço não é mais reservado aqui: ela passou a
          existir só no repouso (ver kiosk/TotemViewport.tsx), e um alvo de 88px
          guardado para um botão que não está na tela é uma faixa de vidro vazia
          ocupando o topo do cardápio — a parte que o cliente lê primeiro. */}
      {/* Uma linha, três coisas, nada absoluto. O cancelar era `absolute` e caía
          em cima da senha — dois textos no mesmo canto, e o que o cliente
          precisa ler (a senha dele) era o que ficava por baixo. Agora dividem a
          linha, e a régua de 88px vale para o botão sem empurrar nada. */}
      <div className="flex min-h-[var(--tap)] items-center gap-[3cqw]">
        <BrandMark />
        {/* O TOPO É SÓ A MARCA. Data, senha e título saíram daqui, e cada um
            por um motivo diferente: a data ninguém consulta num quiosque (quem
            está de pé na fila já sabe que dia é), a senha só vale depois de o
            pedido sair — e ela volta em tamanho grande no recibo —, e o título
            repetia em texto o que a logo já diz em desenho. O que sobra é a
            resposta da única pergunta que o cliente faz olhando para cima:
            "estou no painel do restaurante certo?". */}
        <div className="min-w-0 flex-1" />

        {/* A customer who changed their mind must be able to leave without
            waiting out the idle timeout in front of a queue. Secondary, so it
            may sit high; `reset` is the one door out of a visit. */}
        <button
          type="button"
          data-testid="reset"
          onClick={onCancel}
          // CONTORNO PRÓPRIO, e não o da faixa. Este é o alvo mais perigoso da
          // tela: ele joga fora um carrinho inteiro. A confirmação existe (ver
          // CancelSheet), mas confirmação conserta o toque errado — não conserta
          // um alvo cujo limite pisca conforme a foto que passa por trás dele.
          //
          // Com a faixa opaca, `border-white/30` bastava porque o fundo era
          // sempre o mesmo preto. Sobre vidro o fundo é o cardápio, então o
          // botão passou a levar a própria pane densa (`glass-media`, com alpha
          // calculado) e uma borda de 60%: ele fica igual a si mesmo com um
          // hambúrguer claro ou uma pizza escura atravessando embaixo.
          className="press glass-media flex shrink-0 items-center gap-[1.5cqw] rounded-totem border-2 border-white/60 px-[3.5cqw] uppercase tracking-[0.18em]"
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
})

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
      // Pastilha pequena, quase só texto: leva o vidro DENSO inteiro. Não há
      // nada debaixo dela para revelar, então abrir a pane aqui só custaria
      // legibilidade sem devolver foto nenhuma.
      className="glass-media flex items-center gap-[1.5cqw] rounded-full px-[3cqw] py-[1.2cqw] uppercase tracking-[0.14em]"
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
        // A inativa não tem fundo nenhum: o fundo dela é a pane da trilha. Um
        // branco próprio por cima do vidro emendaria cinco retângulos num
        // material que devia ser contínuo.
        //
        // A ATIVA É A COR DA CASA, e não o preto de antes. A trilha é a única
        // peça do cardápio que fica acesa o tempo todo, e preto ali é a cor de
        // qualquer painel — a casa só aparecia lá embaixo, no botão de
        // finalizar. Com a cor da marca, a coluna que o cliente olha para se
        // localizar é a mesma coisa que o logo no topo.
        active ? 'sheen bg-action text-on-action' : 'bg-transparent text-ink',
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

function ProductCard({
  product,
  highlighted = false,
  dimmed = false,
  onOpen,
}: {
  product: TotemProduct
  /** O garçom está falando DESTE prato agora. */
  highlighted?: boolean
  /** Outro prato está em destaque; este recua. */
  dimmed?: boolean
  onOpen: () => void
}) {
  // A photo URL that 404s must fall back to the icon, not leave an empty grey
  // box. On a panel whose whole pitch is the food imagery, a silently broken
  // image reads as a broken product.
  const [imageBroken, setImageBroken] = useState(false)
  const imageUrl = product.pizza?.imageUrl ?? product.imageUrl
  const card = useRef<HTMLButtonElement>(null)

  // Desce até ele. Sem isto o destaque acontece fora da vista e o cliente
  // continua procurando — que é exatamente o problema que o destaque resolve.
  useEffect(() => {
    if (!highlighted) return
    card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlighted])

  return (
    <button
      ref={card}
      type="button"
      data-testid={`product-${product.id}`}
      data-highlighted={highlighted ? 'true' : undefined}
      data-sold-out={product.soldOut ? 'true' : 'false'}
      disabled={product.soldOut}
      onClick={onOpen}
      className={[
        'press glass flex min-h-[34cqw] flex-col overflow-hidden rounded-totem text-left disabled:opacity-60',
        // Como o cartão se descola da página é marca: sombra difusa numa casa
        // que quer parecer cuidada, deslocamento sólido de placa esmaltada
        // numa lanchonete. Ver TotemTheme.elevation — `--glass-depth` já traz a
        // elevação da casa junto com a quina de luz, então o cartão não precisa
        // mais da sombra avulsa.
        //
        // E O CARTÃO NÃO DESFOCA NADA. Ele mora sobre a página, que é uma cor
        // chapada: desfocar uma cor chapada devolve a mesma cor e cobra uma
        // camada de composição. Numa grade de dez cartões que rola, dez dessas
        // é a diferença entre rolagem lisa e rolagem que engasga — e o efeito
        // visível seria exatamente zero pixel.
        // O "overlay no resto" é feito pelos IRMÃOS recuando, não por uma
        // camada por cima. Uma camada teria de vencer o empilhamento de um
        // container que rola, e o cartão em destaque teria de furá-la — muito
        // aparato para um efeito que a opacidade dos vizinhos entrega melhor.
        'transition-[transform,opacity,filter,box-shadow] duration-300 ease-out',
        highlighted ? 'z-10 scale-[1.06] shadow-[0_1cqw_3cqw_rgba(11,11,12,0.28)] ring-[0.5cqw] ring-action-ink' : '',
        dimmed ? 'scale-[0.97] opacity-30 saturate-50' : '',
      ].join(' ')}
    >
      <div className={`relative h-[18cqw] shrink-0 ${product.pizza || product.burger ? 'bg-[#292827]' : 'bg-hairline'}`}>
        {product.burger ? <BurgerStill layers={burgerLayers(product, [])} fallback={imageUrl} className={product.soldOut ? 'opacity-45 grayscale' : undefined} /> : imageUrl && !imageBroken ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            data-testid={`img-${product.id}`}
            onError={() => setImageBroken(true)}
            // ESGOTADO APAGA A FOTO, não a tarja. O cartão inteiro já vive a
            // 60% — descer dali derruba junto o branco de "ESGOTADO" sobre o
            // preto da tarja, que é a única frase que o cliente precisa ler
            // nesse cartão. Então quem apaga é a comida: cinza e meia luz
            // dizem "hoje não" de longe, e a tarja continua com o contraste
            // medido.
            className={[
              product.pizza ? 'size-full object-contain p-[.8cqw]' : 'size-full object-cover',
              product.soldOut ? 'opacity-45 grayscale' : '',
            ].join(' ')}
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
            // A TARJA NÃO É DE VIDRO, e foi por meia hora. Ela mora dentro de
            // um cartão que está inteiro a 60% de opacidade — o único lugar do
            // painel onde uma camada lava o texto e o fundo dele ao mesmo
            // tempo. O piso calculado do vidro mede a pane ISOLADA, e a tela
            // não pinta a pane isolada: medido em pixel, a tarja de vidro caía
            // para 1,15:1 sobre o pão claro de um lanche esgotado.
            //
            // Uma tarja de esgotado também não é material, é CARIMBO. Ela
            // existe para dizer "não adianta tocar aqui", e essa frase não pode
            // depender do quadro da foto que estiver atrás.
            // E é OPACA, o que o `/85` de antes não era. A conta que ninguém
            // tinha feito: a tarja é composta sobre a foto, e só DEPOIS o
            // cartão inteiro vai a 60% de opacidade contra a página — dois
            // estágios, e o segundo lava o branco do texto junto com o preto do
            // fundo. Medido em pixel sobre o pão claro de um lanche esgotado,
            // `bg-ink/85` dava 2,88:1. Opaca dá 4,63:1, que é o piso.
            className="absolute inset-x-0 bottom-0 bg-ink py-[1cqw] text-center uppercase tracking-[0.2em] text-white"
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
          <span className="tnum font-bold text-action-ink" style={{ fontSize: 'var(--step-title)' }}>
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
      <h2 className="type-display" style={{ fontSize: 'var(--step-title)' }}>
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
