import type { ChargeRequest, ChargeResult, PaymentStatus, PaymentTerminalDriver } from '@/payment/driver'

// ---------------------------------------------------------------------------
// The real terminal — a STUB, not a half-implementation.
//
// Deliberately unwritten because the three ways a bolted-on Brazilian pinpad
// can be reached are genuinely different pieces of work, and guessing wrong
// costs more than waiting:
//
//   1. LOCAL HTTP. Some integrations (Stone Connect, certain Getnet SmartPOS
//      builds) expose an endpoint on the machine itself. Cheapest by far: fill
//      in `endpoint` below and this file is ~40 lines. Watch for mixed content
//      — an https panel calling http://localhost is blocked.
//
//   2. NATIVE BRIDGE over USB. Cielo LIO and most standalone pinpads speak a
//      serial/ABECS protocol no browser can reach. Needs a small local daemon
//      (Node or Rust) exposing a websocket, plus its own install/update story
//      on the panel. This is the expensive one.
//
//   3. ANDROID HANDOFF. If the totem's terminal is a SmartPOS running Android,
//      payment is an intent to the acquirer's app and a result back. Only
//      possible if the panel runs the app as a WebView inside a native shell,
//      which changes how this whole app is deployed.
//
// Whoever wires this: the interface is the contract, and `PaymentScreen` reads
// only the statuses. Nothing in the UI should need to change.
// ---------------------------------------------------------------------------

export function createPinpadTerminal(): PaymentTerminalDriver {
  const unavailable = (): ChargeResult => ({
    status: 'declined',
    message: 'Maquininha não configurada neste totem. Pague no caixa.',
  })

  return {
    id: 'pinpad',
    getStatus: (): PaymentStatus => 'idle',
    cancel: async () => undefined,
    charge: async (_request: ChargeRequest) => unavailable(),
  }
}
