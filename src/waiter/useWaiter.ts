import { create } from 'zustand'

// ---------------------------------------------------------------------------
// The waiter's state of mind.
//
// One machine, whichever way the customer is talking. The transport (text over
// the Fayz broker, or voice over WebRTC) only pushes events in — so the dock
// looks and behaves identically whether the order arrives typed or spoken, and
// the whole surface is testable without a microphone.
//
// `phase` is the single most important thing on screen. In a noisy dining room
// the customer cannot tell a panel that is listening from one that is frozen,
// and that uncertainty is what makes people give up and join the till queue.
// ---------------------------------------------------------------------------

export type WaiterPhase =
  | 'off'        // not configured / disabled — the dock does not render
  | 'idle'       // present, waiting
  | 'listening'  // microphone open, transcribing
  | 'thinking'   // model is working
  | 'speaking'   // reading a reply out loud
  | 'error'

export interface WaiterTurn {
  id: string
  from: 'customer' | 'waiter'
  text: string
  /** Still being transcribed / still streaming in. */
  partial?: boolean
  /** Tools the waiter ran for this turn, for the "did it hear me" trace. */
  did?: string[]
}

interface WaiterState {
  phase: WaiterPhase
  /** What the customer is saying RIGHT NOW, before the turn is committed. */
  liveTranscript: string
  turns: WaiterTurn[]
  /** 0-1, drives the orb while listening. */
  level: number
  error: string | null
  /** Expanded into the full conversation sheet. */
  expanded: boolean
  /**
   * Falar, de qualquer lugar.
   *
   * O botao de falar mora na barra inferior, renderizada por seis telas; o
   * transporte mora no `Waiter`, que so existe no cardapio. Passar os dois
   * callbacks por prop atravessaria todas essas telas para nada. Quem tem o
   * transporte registra aqui, e o botao chama daqui.
   */
  controls: { start: () => void; stop: () => void } | null
  /**
   * Como a TELA fala com o garçom.
   *
   * Registrado por quem tem o transporte, do mesmo jeito que `controls`. A tela
   * de pagamento não conhece transporte nenhum — ela emite um evento e segue.
   */
  announce: ((instruction: string) => void) | null
  /**
   * O cliente aceitou ser atendido FALANDO, e a partir daí é atendido falando.
   *
   * Nasce no toque do orbe na tela inicial e vale a visita inteira. Antes isto
   * era só uma intenção de abrir o microfone lá no cardápio, e o resultado era
   * o pior dos dois mundos: a pessoa tocava no orbe, atravessava DUAS telas em
   * silêncio absoluto — comer aqui ou levar, telefone — e o garçom só aparecia
   * quando ela já tinha feito tudo sozinha no dedo. Um garçom que chega depois
   * de o cliente se sentar, pedir e pagar não é um garçom.
   *
   * Estando `engaged`, ele entra em cena no primeiro passo, cumprimenta e
   * conduz cada tela até o cardápio.
   */
  engaged: boolean

  setEngaged: (engaged: boolean) => void
  setControls: (controls: WaiterState['controls']) => void
  setAnnounce: (announce: WaiterState['announce']) => void
  setPhase: (phase: WaiterPhase) => void
  setLive: (text: string) => void
  setLevel: (level: number) => void
  pushTurn: (turn: WaiterTurn) => void
  updateTurn: (id: string, patch: Partial<WaiterTurn>) => void
  setError: (message: string | null) => void
  setExpanded: (expanded: boolean) => void
  reset: () => void
}

/** Quanto tempo uma frase de erro fica na faixa antes de sair de cena. */
const ERROR_TTL_MS = 8_000
let errorTimer: ReturnType<typeof setTimeout> | null = null

/** The last thing the waiter said — what the dock shows when collapsed. */
export function lastWaiterLine(turns: WaiterTurn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].from === 'waiter' && turns[i].text.trim()) return turns[i].text
  }
  return null
}

const empty = {
  phase: 'idle' as WaiterPhase,
  liveTranscript: '',
  turns: [] as WaiterTurn[],
  level: 0,
  error: null,
  expanded: false,
}

export const useWaiter = create<WaiterState>((set, get) => ({
  ...empty,
  controls: null,
  announce: null,
  engaged: false,

  setEngaged: (engaged) => set({ engaged }),
  setControls: (controls) => set({ controls }),
  setAnnounce: (announce) => set({ announce }),
  setPhase: (phase) => set({ phase }),
  setLive: (liveTranscript) => set({ liveTranscript }),
  setLevel: (level) => set({ level }),
  pushTurn: (turn) => set({ turns: [...get().turns, turn] }),
  updateTurn: (id, patch) =>
    set({ turns: get().turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)) }),
  // O erro APAGA SOZINHO. Ele é um aviso, não um estado: deixado aceso, a
  // faixa fica vermelha para o resto da visita — inclusive depois de o cliente
  // já ter conseguido pedir — e a próxima pessoa encontra o painel gritando
  // sobre uma falha que passou.
  setError: (error) => {
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
    if (error) {
      errorTimer = setTimeout(() => {
        const state = useWaiter.getState()
        if (state.error === error) state.setError(null)
      }, ERROR_TTL_MS)
    }
    set({ error, phase: error ? 'error' : 'idle' })
  },
  setExpanded: (expanded) => set({ expanded }),

  // A new customer gets a new waiter. Nothing from the last visit survives —
  // not the transcript, not the conversation, not the error, e nem o convite
  // aceito: quem chega agora não pediu para ser atendido falando.
  reset: () => {
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
    set({ ...empty, engaged: false })
  },
}))
