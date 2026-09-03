import type { TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// How the waiter hears and speaks. The brain does not know or care.
//
// Two implementations land: `text` over the Fayz broker (V3) and `voice` over
// OpenAI Realtime WebRTC (V4). Both drive the same state machine and run the
// same tools, so the waiter behaves identically typed or spoken — and the
// surface can be tested in CI with a scripted transport and no network.
// ---------------------------------------------------------------------------

export interface WaiterTransport {
  readonly id: 'scripted' | 'text' | 'voice'
  /** A typed or transcribed customer turn. */
  send(text: string, catalog: TotemCatalog): Promise<void>
  /**
   * A TELA avisando o garçom do que acabou de acontecer.
   *
   * `instruction` diz o fato e o objetivo; as palavras são dele. Opcional: um
   * transporte que não saiba anunciar simplesmente não narra, e o painel
   * continua funcionando — a maquininha não depende do assistente para
   * funcionar, e a tela nunca pode depender.
   */
  announce?(instruction: string, catalog: TotemCatalog): Promise<void>
  /**
   * O cliente pediu para ser atendido falando, e ainda não foi dito nada.
   *
   * Diferente de `announce`, que só narra numa sessão que já existe: `greet`
   * ABRE a sessão, abre o microfone e faz o garçom falar primeiro. É a única
   * fala que o cliente não pediu — e ele pediu, tocando no orbe.
   */
  greet?(instruction: string, catalog: TotemCatalog): Promise<void>
  /** Push-to-talk. A no-op on transports with no microphone. */
  startListening?(catalog: TotemCatalog): Promise<void>
  stopListening?(): Promise<void>
  /** Tear down — new visit, idle timeout, panel closing. */
  dispose(): void
}
