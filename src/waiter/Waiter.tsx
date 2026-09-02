import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useCatalog } from '@/menu/useCatalog'
import { useTotemSession } from '@/session/useTotemSession'
import { WaiterDock } from '@/waiter/WaiterDock'
import { WaiterPanel } from '@/waiter/WaiterPanel'
import { useWaiter } from '@/waiter/useWaiter'
import { waiterTransport } from '@/waiter/index'

// ---------------------------------------------------------------------------
// The waiter, wired up.
//
// It lives ONLY on the menu step. That is not a limitation, it is the point:
// the order is built on the menu, and a waiter offering to help on the payment
// screen is a waiter standing between a customer and their card.
//
// A new visit gets a new waiter — the transport is torn down on `visitId`, so
// nothing a stranger said survives into the next person's order.
// ---------------------------------------------------------------------------

const SUGGESTIONS = ['O que você recomenda?', 'Tem algo sem carne?']

export function Waiter() {
  const step = useTotemSession((s) => s.step)
  const visitId = useTotemSession((s) => s.visitId)
  const catalogState = useCatalog()
  const resetWaiter = useWaiter((s) => s.reset)
  const setPhase = useWaiter((s) => s.setPhase)
  const setControls = useWaiter((s) => s.setControls)

  const transport = useMemo(waiterTransport, [])
  const catalogRef = useRef(catalogState)
  catalogRef.current = catalogState

  // Every visit starts from silence.
  useEffect(() => {
    resetWaiter()
    return () => transport?.dispose()
  }, [visitId, resetWaiter, transport])

  useEffect(() => {
    if (!transport) setPhase('off')
  }, [transport, setPhase])

  const send = useCallback(
    (text: string) => {
      const state = catalogRef.current
      if (!transport || state.status !== 'ready') return
      void transport.send(text, state.catalog)
    },
    [transport],
  )

  const startTalking = useCallback(() => {
    const state = catalogRef.current
    if (!transport?.startListening || state.status !== 'ready') return
    void transport.startListening(state.catalog)
  }, [transport])

  const stopTalking = useCallback(() => {
    void transport?.stopListening?.()
  }, [transport])

  // O botão de falar mora na barra inferior, que é chrome global; o transporte
  // mora aqui, que só existe no cardápio. O registro é o que liga os dois sem
  // arrastar duas props por seis telas — e a limpeza é o que garante que o
  // botão suma quando o garçom sai de cena.
  useEffect(() => {
    if (!transport || step !== 'menu') {
      setControls(null)
      return
    }
    setControls({ start: startTalking, stop: stopTalking })
    return () => setControls(null)
  }, [transport, step, startTalking, stopTalking, setControls])

  if (!transport || step !== 'menu') return null

  return (
    <>
      <WaiterDock suggestions={SUGGESTIONS} onSuggestion={send} />
      <WaiterPanel onSend={send} />
    </>
  )
}
