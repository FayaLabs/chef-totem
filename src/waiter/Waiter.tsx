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

// As aberturas vêm do tenant: "Qual café você recomenda?" numa cafeteria e
// "Qual a mais pedida?" numa pizzaria não são a mesma pergunta.
import { activeWaiterPersona } from '@/waiter/persona'

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

  const setExpanded = useWaiter((s) => s.setExpanded)
  const setError = useWaiter((s) => s.setError)
  const setAnnounce = useWaiter((s) => s.setAnnounce)

  const send = useCallback(
    (text: string) => {
      const state = catalogRef.current
      if (!transport || state.status !== 'ready') return
      // Escrever ou tocar numa sugestão ABRE a conversa. Sem isto a frase do
      // cliente aparecia por um segundo na faixa de uma linha e era substituída
      // pela resposta — ele via o próprio pedido piscar e sumir, sem nenhum
      // lugar onde reler o que perguntou.
      //
      // A voz NÃO abre: quem está falando está olhando o cardápio, não lendo.
      setExpanded(true)
      setError(null)
      void transport.send(text, state.catalog)
    },
    [transport, setExpanded, setError],
  )

  const startTalking = useCallback(() => {
    const state = catalogRef.current
    if (!transport?.startListening || state.status !== 'ready') return
    // Uma nova tentativa apaga o erro da anterior. Sem isto a frase vermelha
    // ficava na faixa para sempre — inclusive depois de o cliente fazer
    // exatamente o que ela mandou ("toque no orbe e tente de novo"), que é o
    // jeito mais rápido de ensinar alguém a não confiar na tela.
    setError(null)
    void transport.startListening(state.catalog)
  }, [transport, setError])

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

  // O canal por onde a TELA avisa o garçom. Vale em todo passo, não só no
  // cardápio: é no pagamento que a orientação falada mais serve.
  useEffect(() => {
    if (!transport?.announce) {
      setAnnounce(null)
      return
    }
    setAnnounce((instruction: string) => {
      const state = catalogRef.current
      if (state.status !== 'ready') return
      void transport.announce?.(instruction, state.catalog)
    })
    return () => setAnnounce(null)
  }, [transport, setAnnounce])

  // A intenção que veio do atrair, cobrada aqui. Consumida na hora: se o
  // cliente voltar ao cardápio depois, o microfone não abre sozinho de novo.
  useEffect(() => {
    if (step !== 'menu' || !transport) return
    if (!useWaiter.getState().autoListen) return
    useWaiter.getState().setAutoListen(false)
    startTalking()
  }, [step, transport, startTalking])

  if (!transport) return null

  // A FAIXA existe no cardápio, no pagamento e no recibo — mas o que ela faz
  // muda. No cardápio ela toma o pedido; nos outros dois ela só acompanha, sem
  // sugestões, porque um garçom que oferece sobremesa na tela de pagamento é um
  // garçom entre o cliente e o cartão.
  const guiding = step === 'payment' || step === 'receipt'
  if (step !== 'menu' && !guiding) return null

  return (
    <>
      <WaiterDock suggestions={guiding ? [] : activeWaiterPersona().suggestions} onSuggestion={send} />
      {guiding ? null : <WaiterPanel onSend={send} />}
    </>
  )
}
