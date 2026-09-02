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
  /** Push-to-talk. A no-op on transports with no microphone. */
  startListening?(catalog: TotemCatalog): Promise<void>
  stopListening?(): Promise<void>
  /** Tear down — new visit, idle timeout, panel closing. */
  dispose(): void
}
