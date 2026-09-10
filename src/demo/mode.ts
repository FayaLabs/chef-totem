import { DEMO_TENANTS, PIZZA_HOUSE, type DemoTenant, type DemoTenantId } from '@/demo/tenants'

// ---------------------------------------------------------------------------
// Qual restaurante está no vidro, e quem decide.
//
// Antes isto era uma função de quatro linhas dentro do documento dos tenants,
// lendo `?tenant=` e caindo no `.env`. Serviu enquanto trocar de casa era uma
// coisa que se fazia editando a URL num laptop. Numa feira não é: quem opera o
// totem está de pé na frente dele, sem teclado, e a pergunta "dá pra ver o de
// hambúrguer?" chega no meio de uma conversa com um cliente.
//
// Então a escolha passou a ser um ESTADO PERSISTIDO, e a ordem de precedência
// existe para que cada um dos três jeitos de escolher continue funcionando:
//
//   1. `?tenant=` na URL       — o link que alguém manda, e o teste e2e
//   2. o que foi tocado no painel — o seletor escondido, que sobrevive a reload
//   3. `VITE_TOTEM_DEMO_TENANT`  — o padrão da máquina, no `.env`
//
// A URL ganha do toque de propósito: um e2e que abre `/?tenant=maxburger` não
// pode depender do que a última execução deixou no localStorage.
//
// `live` É UMA OPÇÃO. Escolher um restaurante de demonstração num painel ligado
// ao Supabase de verdade não pode pintar a marca da pizzaria por cima do
// cardápio do cliente real — isso é um totem mentindo sobre onde o pedido vai
// cair. Então a escolha carrega as duas coisas juntas: a marca E a fonte do
// cardápio. Voltar para o cliente real é escolher "Ao vivo" na mesma lista.
// ---------------------------------------------------------------------------

/** Uma casa de demonstração, ou o tenant de verdade deste aparelho. */
export type DemoSelection = DemoTenantId | 'live'

/** Onde a escolha do operador sobrevive a um reload. */
export const SELECTION_KEY = 'totem.demo.selection'

/** O parâmetro de URL, que ganha de tudo. */
export const SELECTION_PARAM = 'tenant'

function isSelection(value: string | null | undefined): value is DemoSelection {
  return value === 'live' || (!!value && value in DEMO_TENANTS)
}

function fromUrl(): DemoSelection | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get(SELECTION_PARAM)
  return isSelection(value) ? value : null
}

function fromStorage(): DemoSelection | null {
  // Um quiosque pode subir com o armazenamento bloqueado (janela anônima, uma
  // política de dispositivo). Isso torna o seletor esquecido, não quebrado.
  try {
    const value = window.localStorage.getItem(SELECTION_KEY)
    return isSelection(value) ? value : null
  } catch {
    return null
  }
}

/**
 * A escolha EXPLÍCITA, se existir — o que alguém pediu, por link ou por toque.
 *
 * `null` significa "ninguém escolheu": aí valem o `.env` e o padrão, e é por
 * isso que isto é separado de `activeDemoTenant()`. Uma função só não
 * conseguiria distinguir "escolheram a pizzaria" de "a pizzaria é o padrão".
 */
export function activeSelection(): DemoSelection | null {
  return fromUrl() ?? fromStorage()
}

/**
 * De ONDE veio a escolha — para o painel de depuração dizer a verdade.
 *
 * "Está na MaxBurger" não ajuda quem está tentando entender por que o painel
 * abriu na casa errada. "Está na MaxBurger porque o link pediu" ajuda, e é a
 * diferença entre um operador que corrige sozinho e um que liga para alguém.
 */
export function selectionSource(): 'url' | 'painel' | '.env' {
  if (fromUrl()) return 'url'
  if (fromStorage()) return 'painel'
  return '.env'
}

/**
 * O painel está lendo o cardápio de demonstração?
 *
 * Todo caminho que muda de comportamento em demonstração pergunta AQUI —
 * cardápio, pedido, recibo, reconhecimento de cliente e a persona do garçom.
 * Enquanto era `import.meta.env.VITE_TOTEM_CATALOG === 'demo'` repetido em sete
 * arquivos, o seletor teria de mudar sete coisas e acertaria seis.
 */
export function isDemoCatalog(): boolean {
  const chosen = activeSelection()
  if (chosen) return chosen !== 'live'
  return import.meta.env.VITE_TOTEM_CATALOG === 'demo'
}

/** O documento da casa no ar. Só faz sentido com `isDemoCatalog()` verdadeiro. */
export function activeDemoTenant(): DemoTenant {
  const chosen = activeSelection()
  if (chosen && chosen !== 'live') return DEMO_TENANTS[chosen]

  const fromEnv = import.meta.env.VITE_TOTEM_DEMO_TENANT
  return fromEnv && fromEnv in DEMO_TENANTS ? DEMO_TENANTS[fromEnv] : PIZZA_HOUSE
}

/**
 * Troca a casa e RECARREGA.
 *
 * O tema é pintado uma vez, antes do primeiro quadro (ver `main.tsx`), e o
 * `totemConfig` é uma constante de módulo. Dava para transformar os dois em
 * estado reativo, e o preço seria um `useEffect` em cada tela para uma coisa
 * que muda três vezes por feira. Um reload de meio segundo entrega a troca
 * INTEIRA — marca, paleta, tipografia, cardápio, voz do assistente — sem que
 * nenhum componente precise saber que ela existe.
 *
 * A URL é reescrita junto porque ela ganha do armazenamento: sem isso, tocar
 * "MaxBurger" num painel aberto em `?tenant=cafe-sabor` não faria nada visível,
 * e o operador concluiria, com razão, que o botão está quebrado.
 *
 * `replace`, não `assign`: o totem não tem botão de voltar, e um histórico que
 * cresce a cada troca é lixo que ninguém vai limpar.
 */
export function selectDemo(selection: DemoSelection): void {
  try {
    window.localStorage.setItem(SELECTION_KEY, selection)
  } catch {
    // Sem persistência a troca ainda vale para esta sessão: o parâmetro de URL
    // abaixo carrega a escolha sozinho.
  }

  const url = new URL(window.location.href)
  url.searchParams.set(SELECTION_PARAM, selection)
  window.location.replace(url.toString())
}
