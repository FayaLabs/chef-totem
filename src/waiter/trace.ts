import { create } from 'zustand'

// ---------------------------------------------------------------------------
// O QUE ACABOU DE ACONTECER NA SESSÃO DE VOZ.
//
// A tela de conversa mostra o que foi DITO, e isso não basta para entender por
// que ele falou duas vezes: o que causa uma fala é um `response.create`, e um
// `response.create` pode vir do servidor (o VAD fechou o turno), do retorno de
// uma ferramenta, ou de um aviso de tela. Sem ver essa camada, o defeito é
// "está estranho" e o conserto é chute.
//
// É um anel curto e em memória: um quiosque não guarda log de cliente, e o que
// interessa é o último minuto. Ligado por `?debug=waiter` (ou em dev), e
// desligado ele não custa nem a alocação — `traceWaiter` sai cedo.
// ---------------------------------------------------------------------------

export interface WaiterTraceEntry {
  at: number
  /** De onde veio: sessão, servidor, ferramenta, tela, fase. */
  kind: 'session' | 'server' | 'tool' | 'screen' | 'phase' | 'error'
  text: string
}

const LIMIT = 80

interface TraceState {
  entries: WaiterTraceEntry[]
  push: (entry: WaiterTraceEntry) => void
  clear: () => void
}

export const useWaiterTrace = create<TraceState>((set) => ({
  entries: [],
  push: (entry) => set((state) => ({ entries: [...state.entries, entry].slice(-LIMIT) })),
  clear: () => set({ entries: [] }),
}))

let enabled: boolean | null = null

/** Ligado por `?debug=waiter`, e sempre em dev. A escolha é lida uma vez. */
export function waiterTraceEnabled(): boolean {
  if (enabled !== null) return enabled
  if (typeof window === 'undefined') return (enabled = false)
  const asked = new URLSearchParams(window.location.search).get('debug')
  enabled = import.meta.env.DEV || asked === 'waiter'
  return enabled
}

export function traceWaiter(kind: WaiterTraceEntry['kind'], text: string): void {
  if (!waiterTraceEnabled()) return
  useWaiterTrace.getState().push({ at: Date.now(), kind, text })
}

/** `12:04:31.412` — o milissegundo importa: o defeito é duas coisas juntas. */
export function traceClock(at: number): string {
  const date = new Date(at)
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}
