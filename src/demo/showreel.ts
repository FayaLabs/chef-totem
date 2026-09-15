import { create } from 'zustand'
import { useCart } from '@/cart/useCart'
import { catalogNow } from '@/menu/useCatalog'
import { useMenuUi } from '@/menu/useMenuUi'
import { useProductDraft } from '@/menu/useProductDraft'
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

/** Quanto tempo cada beat fica na tela. Ritmo de vitrine, não de operação. */
const BEAT = {
  breath: 900,
  read: 1600,
  admire: 2400,
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

/** O primeiro produto que tem o que mostrar: opções para montar. */
function showpiece(catalog: TotemCatalog): TotemProduct | undefined {
  return (
    catalog.products.find((p) => !p.soldOut && (p.modifierGroups?.length ?? 0) >= 2) ??
    catalog.products.find((p) => !p.soldOut)
  )
}

/** Uma opção de cada grupo, para a montagem acontecer na tela. */
function dressUp(product: TotemProduct): void {
  const draft = useProductDraft.getState()
  for (const group of product.modifierGroups ?? []) {
    const option = group.modifiers[0]
    if (!option) continue
    draft.toggle(group.id, option.id, group.maxSelections, group.required)
  }
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
    if (!(await beat('atrair', BEAT.read, () => session.reset()))) break
    if (!(await beat('começar', BEAT.breath, () => useTotemSession.getState().start()))) break
    if (!(await beat('levar ou comer aqui', BEAT.read, () => useTotemSession.getState().chooseMode('takeaway')))) break
    if (!(await beat('identificação', BEAT.breath, () => useTotemSession.getState().identify(null)))) break

    const product = showpiece(catalog)
    if (!product) break
    if (!(await beat('cardápio', BEAT.read, () => useProductDraft.getState().close()))) break
    if (!(await beat(`abrindo ${product.name}`, BEAT.admire, () => useProductDraft.getState().open(product.id)))) break
    // O ponto alto: as camadas entrando uma a uma no lanche montado.
    if (!(await beat('montando', BEAT.admire, () => dressUp(product)))) break
    if (!(await beat('no pedido', BEAT.read, () => {
      useCart.getState().add(product, 1, [], null)
      useProductDraft.getState().close()
    }))) break
    if (!(await beat('carrinho', BEAT.read, () => useMenuUi.getState().setCartOpen(true)))) break
    if (!(await beat('pagamento', BEAT.admire, () => {
      useMenuUi.getState().setCartOpen(false)
      useTotemSession.getState().goTo('payment')
    }))) break
    // E VOLTA — sem pagar. Ver a regra 2 no topo.
    if (!(await beat('recomeçando', BEAT.breath, () => {
      useCart.getState().clear()
      useTotemSession.getState().reset()
    }))) break
  }

  if (token === mine) {
    useShowreel.getState().setRunning(false)
    useShowreel.getState().setBeat(null)
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
