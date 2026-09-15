import { create } from 'zustand'
import { useCart } from '@/cart/useCart'
import { catalogNow } from '@/menu/useCatalog'
import { useMenuUi } from '@/menu/useMenuUi'
import { useProductDraft } from '@/menu/useProductDraft'
import { activeDemoTenant, isDemoCatalog, selectDemo } from '@/demo/mode'
import { useTotemSession } from '@/session/useTotemSession'
import { useWaiter } from '@/waiter/useWaiter'
import type { TotemCatalog, TotemProduct } from '@/menu/types'

// ---------------------------------------------------------------------------
// O PAINEL SE APRESENTANDO SOZINHO.
//
// Num corredor de feira, um totem parado na tela de atrair é um monitor com uma
// foto. O que faz alguém parar é ver a coisa FUNCIONANDO — o hambúrguer se
// montando camada por camada, o cartão entrando no pedido, a conta fechando —
// e isso ninguém descobre olhando uma tela estática.
//
// Então o painel roda sozinho: escolhe, monta, adiciona, mostra a conta, e
// recomeça. É o mesmo aplicativo de verdade movendo os mesmos stores; nada aqui
// é uma animação gravada, e é por isso que ele demonstra o produto em vez de um
// vídeo do produto.
//
// DUAS REGRAS QUE NÃO SE NEGOCIAM:
//
// 1. O DEDO GANHA. Qualquer toque, tecla ou clique para a apresentação NA HORA
//    e devolve o painel limpo para quem chegou. Um cliente disputando a tela
//    com uma demonstração é pior do que não ter demonstração nenhuma. O
//    listener é de CAPTURA e não cancela o evento de propósito: o mesmo toque
//    que encerra a volta já começa a visita da pessoa, em vez de exigir um
//    segundo toque para fazer o que ela achou que tinha feito no primeiro.
// 2. NINGUÉM PAGA. A volta termina na tela de pagamento e volta ao começo —
//    `placeOrder` nunca é chamado. Com o painel apontado para um tenant real,
//    uma apresentação em loop viraria uma comanda a cada 40 segundos e um
//    Fechamento do Dia cheio de vendas que ninguém fez.
// ---------------------------------------------------------------------------

/**
 * O RELÓGIO DA VITRINE.
 *
 * A primeira versão corria: quarenta segundos de painel em dezessete, com as
 * escolhas aplicadas todas no mesmo quadro. Quem passa no corredor não estava
 * vendo as funcionalidades, estava vendo telas piscando — e o burger, que é o
 * argumento de venda inteiro, montava-se antes de qualquer olho chegar nele.
 *
 * Agora o ritmo é de quem mostra, não de quem opera. `dress` é o número que
 * mais importa: cada escolha dispara a revelação das camadas (2600 ms abertas
 * mais 650 ms para fechar, ver `useBurgerReveal`), então espaçar menos que isso
 * é cortar a animação no meio e emendar a próxima por cima.
 */
const BEAT = {
  /** Uma pausa curta entre dois movimentos que pertencem ao mesmo gesto. */
  breath: 1200,
  /** O tempo de LER uma tela de pergunta a dois metros de distância. */
  read: 2600,
  /** O tempo de ver uma animação acontecer inteira. */
  admire: 3600,
  /** Uma escolha, com a revelação das camadas cabendo inteira entre duas. */
  dress: 3400,
  /** O repouso: a vitrine respira antes de recomeçar. */
  rest: 4200,
} as const

interface ShowreelState {
  running: boolean
  /** O beat atual, para o painel de serviço dizer o que está acontecendo. */
  beat: string | null
  setBeat: (beat: string | null) => void
  setRunning: (running: boolean) => void
}

export const useShowreel = create<ShowreelState>((set) => ({
  running: false,
  beat: null,
  setBeat: (beat) => set({ beat }),
  setRunning: (running) => set({ running }),
}))

let token = 0
let listening = false

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * AS DUAS CASAS QUE VALEM A VITRINE.
 *
 * A cafeteria tem um cardápio bonito e nada que se MONTE na tela. O burger tem
 * camadas que entram uma a uma e a pizza tem o meio a meio girando — é isso que
 * faz alguém no corredor parar de andar, e é por isso que a volta alterna só
 * entre as duas.
 */
const SHOWCASE = ['maxburger', 'pizza-house'] as const

/** A próxima casa da rotação, ou nada quando não há para onde ir. */
function nextHouse(): (typeof SHOWCASE)[number] | null {
  if (!isDemoCatalog()) return null
  const current = activeDemoTenant().id
  const index = SHOWCASE.indexOf(current as (typeof SHOWCASE)[number])
  const next = SHOWCASE[(index + 1) % SHOWCASE.length]
  return next === current ? null : next
}

/** O produto que tem o que mostrar: o que se monta na tela vem primeiro. */
function showpiece(catalog: TotemCatalog): TotemProduct | undefined {
  return (
    catalog.products.find((p) => !p.soldOut && (p.burger || p.pizza)) ??
    catalog.products.find((p) => !p.soldOut && (p.modifierGroups?.length ?? 0) >= 2) ??
    catalog.products.find((p) => !p.soldOut)
  )
}

/** As escolhas que a demonstração faz, UMA A UMA — a montagem é o espetáculo. */
function dressing(product: TotemProduct): { group: string; option: string; label: string }[] {
  const out: { group: string; option: string; label: string }[] = []
  for (const group of product.modifierGroups ?? []) {
    const option = group.modifiers[0]
    if (!option) continue
    out.push({ group: group.id, option: option.id, label: option.name })
  }
  // Cinco escolhas já são vinte segundos de vitrine; além disso a volta fica
  // longa demais para quem está de passagem.
  return out.slice(0, 5)
}

export function showreelRunning(): boolean {
  return useShowreel.getState().running
}

/**
 * Para a apresentação e devolve o painel ao repouso.
 *
 * `reason` só existe para o log: parar por toque e parar por fim da volta são
 * a mesma coisa para a tela e coisas diferentes para quem depura.
 */
export function stopShowreel(): void {
  token += 1
  useShowreel.getState().setRunning(false)
  useShowreel.getState().setBeat(null)
  useProductDraft.getState().close()
  useMenuUi.getState().reset()
  useCart.getState().clear()
  useWaiter.getState().reset()
  useTotemSession.getState().reset()
}

/** O toque de um cliente encerra a apresentação — em captura, antes de a tela reagir. */
function listenForTouch(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  const yield_ = () => {
    if (useShowreel.getState().running) stopShowreel()
  }
  for (const event of ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const) {
    window.addEventListener(event, yield_, { capture: true, passive: true })
  }
}

export async function startShowreel(): Promise<void> {
  if (useShowreel.getState().running) return
  listenForTouch()
  token += 1
  const mine = token
  const alive = () => token === mine && useShowreel.getState().running
  useShowreel.getState().setRunning(true)

  const beat = async (name: string, ms: number, run?: () => void) => {
    if (!alive()) return false
    useShowreel.getState().setBeat(name)
    run?.()
    await sleep(ms)
    return alive()
  }

  while (alive()) {
    const catalog = catalogNow()
    if (!catalog) {
      // Sem cardápio não há o que mostrar. Espera em vez de desistir: a
      // prébusca ainda pode estar chegando quando o painel liga.
      if (!(await beat('esperando o cardápio', BEAT.read))) break
      continue
    }

    const session = useTotemSession.getState()
    if (!(await beat('atrair', BEAT.rest, () => session.reset()))) break
    if (!(await beat('começar', BEAT.breath, () => useTotemSession.getState().start()))) break
    if (!(await beat('levar ou comer aqui', BEAT.read, () => useTotemSession.getState().chooseMode('takeaway')))) break
    if (!(await beat('identificação', BEAT.read, () => useTotemSession.getState().identify(null)))) break

    const product = showpiece(catalog)
    if (!product) break

    // O cardápio ganha um tempo próprio: é a tela com mais coisa para olhar, e
    // fechar o sheet que abre sozinho é o que deixa a grade à vista.
    if (!(await beat('cardápio', BEAT.admire, () => useProductDraft.getState().close()))) break
    const other = catalog.categories.find((category) => category.id !== product.categoryId)
    if (other && !(await beat(`categoria ${other.name}`, BEAT.read, () => useMenuUi.getState().openCategory(other.id)))) break
    if (!(await beat('cardápio inteiro', BEAT.read, () => useMenuUi.getState().openCategory(null)))) break

    if (!(await beat(`abrindo ${product.name}`, BEAT.admire, () => useProductDraft.getState().open(product.id, Boolean(product.pizza))))) break

    // UMA ESCOLHA POR VEZ. Cada uma reabre as camadas do lanche, e é essa
    // montagem — pão, ponto, bacon entrando um a um — que faz alguém parar.
    for (const choice of dressing(product)) {
      const done = await beat(`montando · ${choice.label}`, BEAT.dress, () => {
        const group = product.modifierGroups?.find((g) => g.id === choice.group)
        if (!group) return
        useProductDraft.getState().toggle(choice.group, choice.option, group.maxSelections, group.required)
      })
      if (!done) return
    }

    if (!(await beat('no pedido', BEAT.admire, () => useCart.getState().add(product, 1, [], null)))) break
    // O sheet sai DEPOIS de o item voar para a barra: fechar junto engole a
    // animação de chegada no carrinho, que é meio segundo de produto.
    if (!(await beat('carrinho', BEAT.read, () => useProductDraft.getState().close()))) break
    if (!(await beat('conferindo o pedido', BEAT.admire, () => useMenuUi.getState().setCartOpen(true)))) break
    if (!(await beat('pagamento', BEAT.admire, () => {
      useMenuUi.getState().setCartOpen(false)
      useTotemSession.getState().goTo('payment')
    }))) break
    // E VOLTA — sem pagar. Ver a regra 2 no topo.
    if (!(await beat('recomeçando', BEAT.read, () => {
      useCart.getState().clear()
      useTotemSession.getState().reset()
    }))) break

    // A CASA SEGUINTE. Uma volta por casa, alternando entre as duas que têm o
    // que montar. Trocar de casa RECARREGA o painel (a marca e a paleta são
    // pintadas antes do primeiro quadro — ver `demo/mode.ts`), e a apresentação
    // volta sozinha porque `?showreel` continua na URL que o seletor reescreve.
    const house = nextHouse()
    if (house) {
      if (!(await beat(`trocando para ${house}`, BEAT.breath))) break
      selectDemo(house)
      return
    }
  }

  if (token === mine) {
    useShowreel.getState().setRunning(false)
    useShowreel.getState().setBeat(null)
  }
}

/**
 * O PAINEL SOZINHO VOLTA A SE APRESENTAR.
 *
 * Ligar a demonstração pelo PIN serve para quem está ao lado do totem. O resto
 * do dia ninguém está: o cliente termina o pedido, vai embora, e o painel fica
 * numa tela de atrair parada até a próxima pessoa. Esses minutos são os mesmos
 * em que alguém passa no corredor — e um painel parado não convida ninguém.
 *
 * Só do REPOUSO. Se a pessoa está no meio de um pedido, a demonstração seria a
 * tela tomando a vez dela; quem cuida disso é o `idleSeconds` da sessão, que
 * devolve o painel ao repouso primeiro. Daqui em diante, qualquer toque zera a
 * contagem — e também encerra a apresentação, pela regra 1 lá em cima.
 */
const IDLE_DEFAULT_S = 90

function idleSeconds(): number {
  const asked = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('showreel-idle')
    : null
  const configured = asked ?? import.meta.env.VITE_TOTEM_SHOWREEL_IDLE
  const seconds = Number(configured)
  // Zero ou negativo DESLIGA — é como um painel de cliente real fica quando a
  // vitrine não é o que ele quer.
  if (Number.isFinite(seconds) && seconds <= 0) return 0
  return Number.isFinite(seconds) && seconds > 0 ? seconds : IDLE_DEFAULT_S
}

export function installShowreelIdle(): () => void {
  if (typeof window === 'undefined') return () => {}
  const wait = idleSeconds() * 1000
  if (wait <= 0) return () => {}

  let last = Date.now()
  const touched = () => {
    last = Date.now()
  }
  for (const event of ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const) {
    window.addEventListener(event, touched, { capture: true, passive: true })
  }

  const timer = setInterval(() => {
    if (useShowreel.getState().running) return
    // Só do repouso, e só quando ninguém tocou desde então.
    if (useTotemSession.getState().step !== 'attract') return
    if (Date.now() - last < wait) return
    void startShowreel()
  }, 1000)

  return () => {
    clearInterval(timer)
    for (const event of ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const) {
      window.removeEventListener(event, touched, { capture: true })
    }
  }
}

/**
 * A porta para quem está de fora do React: o PIN de manutenção do shell.
 *
 * O teclado de PIN é injetado pelo Electron e não conhece o app — ele só
 * consegue chamar algo pendurado em `window`. `?showreel` faz o mesmo para um
 * navegador, que é onde isto se testa.
 */
export function installShowreelHatch(): void {
  if (typeof window === 'undefined') return
  ;(window as unknown as { fayzShowreel?: unknown }).fayzShowreel = {
    start: () => void startShowreel(),
    stop: stopShowreel,
    running: showreelRunning,
  }
  if (new URLSearchParams(window.location.search).has('showreel')) void startShowreel()
}
