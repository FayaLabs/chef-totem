import { totemConfig } from '@/config/totem.config'
import { createRealtimeTransport } from '@/waiter/realtime-transport'
import { createScriptedTransport } from '@/waiter/scripted-transport'
import type { WaiterTransport } from '@/waiter/transport'

export { WaiterDock, WAITER_DOCK_HEIGHT } from '@/waiter/WaiterDock'
export { WaiterPanel } from '@/waiter/WaiterPanel'
export { VoiceOrb } from '@/waiter/VoiceOrb'
export { useWaiter, lastWaiterLine, type WaiterPhase, type WaiterTurn } from '@/waiter/useWaiter'
export { buildSnapshot, type WaiterSnapshot } from '@/waiter/snapshot'
export { WAITER_TOOLS, executeWaiterTool, type WaiterTool } from '@/waiter/tools'
export { waiterInstructions, waiterContext } from '@/waiter/instructions'
export type { WaiterTransport } from '@/waiter/transport'

/**
 * Which waiter is on shift.
 *
 * Same shape as `recognitionDriver()`: the flag picks an implementation at call
 * time, and the default is deliberately inert. `scripted` is the CI/dev waiter
 * — never reachable in production, because production has no reason to set it.
 */
export function waiterTransport(): WaiterTransport | null {
  // `?waiter=scripted` is a test seam, the same shape as `?design`: it lets the
  // suite exercise the dock without standing up a second dev server. It can
  // only ever select the scripted waiter, never a real one.
  const forced =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('waiter')
      : null
  if (forced === 'scripted') return createScriptedTransport()

  if (!totemConfig.flags.assistant) return null
  if (import.meta.env.VITE_TOTEM_WAITER === 'scripted') return createScriptedTransport()
  // `voice` fala de verdade — OpenAI Realtime por WebRTC — e exige a edge
  // function `totem-voice-token` publicada. O padrao continua roteirizado: um
  // totem que sobe sem a funcao tem de continuar vendendo.
  if (import.meta.env.VITE_TOTEM_WAITER === 'voice') return createRealtimeTransport()
  return createScriptedTransport()
}
