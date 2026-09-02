import { executeWaiterTool } from '@/waiter/tools'
import { useWaiter } from '@/waiter/useWaiter'
import type { WaiterTransport } from '@/waiter/transport'
import type { TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// A waiter with no model behind it.
//
// This exists so the SURFACE has a test that is not flaky and not billed. CI
// must be able to prove that a customer turn moves the screen, that the orb
// reaches every phase, and that the dock never covers a dish — none of which
// is a question about the model.
//
// It matches a handful of intents with regexes and calls the SAME tools the
// real transports call. When it cannot match, it says so, exactly as a waiter
// who did not catch the order would.
//
// It is never selected in production: `waiterTransport()` only returns it when
// the app is explicitly put in scripted mode.
// ---------------------------------------------------------------------------

const id = () => `t${Math.floor(Math.random() * 1e9).toString(36)}`

interface Intent {
  match: RegExp
  run: (m: RegExpMatchArray, catalog: TotemCatalog) => { say: string; did: string[] }
}

const INTENTS: Intent[] = [
  {
    match: /^(?:me v[êe]|quero|manda|traz|adiciona)\s+(?:uma?\s+|um\s+)?(.+)$/i,
    run: (m, catalog) => {
      const did: string[] = []
      // Split in code, not in the regex: a lazy group beside an optional one
      // backtracks into swallowing the whole phrase, and the failure is silent
      // — the dish is found, the options are not, and no order happens.
      const [dish, ...rest] = m[1].split(/\s+com\s+/i)
      const opened = executeWaiterTool('open_product', { product: dish }, catalog)
      did.push(`abriu ${dish}`)
      if (opened.startsWith('Não achei') || opened.includes('esgotado')) {
        return { say: opened, did }
      }
      for (const option of rest.join(' com ').split(/\s*(?:,|\se\s)\s*/).filter(Boolean)) {
        executeWaiterTool('choose_option', { option }, catalog)
        did.push(`marcou ${option}`)
      }
      const added = executeWaiterTool('add_to_order', {}, catalog)
      did.push(added.startsWith('Falta') ? 'aguardando escolha' : 'adicionou')
      return { say: added, did }
    },
  },
  {
    match: /(?:mostra|abre|ver)\s+(?:as?\s+|os\s+)?(.+)/i,
    run: (m, catalog) => ({
      say: executeWaiterTool('open_category', { category: m[1] }, catalog),
      did: [`abriu ${m[1]}`],
    }),
  },
  {
    match: /(?:meu pedido|carrinho|o que eu pedi)/i,
    run: (_m, catalog) => {
      executeWaiterTool('show_cart', {}, catalog)
      return { say: 'Aqui está seu pedido.', did: ['abriu o carrinho'] }
    },
  },
  {
    match: /(?:[ée] s[óo]|finalizar|pagar|terminei|s[óo] isso)/i,
    run: (_m, catalog) => ({
      say: executeWaiterTool('go_to_payment', {}, catalog),
      did: ['foi para o pagamento'],
    }),
  },
  {
    match: /(?:tem|voc[êe]s t[êe]m|procuro)\s+(.+)/i,
    run: (m, catalog) => ({
      say: executeWaiterTool('search_menu', { query: m[1] }, catalog),
      did: [`procurou ${m[1]}`],
    }),
  },
]

export function createScriptedTransport(): WaiterTransport {
  return {
    id: 'scripted',
    dispose: () => undefined,

    async send(text, catalog) {
      const waiter = useWaiter.getState()
      waiter.pushTurn({ id: id(), from: 'customer', text })
      waiter.setLive('')
      waiter.setPhase('thinking')

      const clean = text.trim()
      const intent = INTENTS.map((i) => ({ i, m: clean.match(i.match) })).find((x) => x.m)

      const result = intent?.m
        ? intent.i.run(intent.m, catalog)
        : { say: 'Não entendi. Pode repetir?', did: [] as string[] }

      waiter.pushTurn({ id: id(), from: 'waiter', text: result.say, did: result.did })
      waiter.setPhase('idle')
    },

    async startListening() {
      // No microphone here: the phase still moves so the orb, the dock label
      // and every visual affordance are exercised by the same test.
      useWaiter.getState().setPhase('listening')
    },

    async stopListening() {
      useWaiter.getState().setPhase('idle')
    },
  }
}
