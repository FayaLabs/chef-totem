import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useCatalog } from '@/menu/useCatalog'
import { useTotemSession, type TotemStep } from '@/session/useTotemSession'
import { announceToWaiter, greetingInstruction } from '@/waiter/events'
import { WaiterDock } from '@/waiter/WaiterDock'
import { WaiterPanel } from '@/waiter/WaiterPanel'
import { useWaiter } from '@/waiter/useWaiter'
import { useWaiterPresence } from '@/waiter/presence'
import { waiterTransport } from '@/waiter/index'

// ---------------------------------------------------------------------------
// The waiter, wired up.
//
// QUEM NÃO CHAMOU só o encontra no cardápio. É onde o pedido é montado, e um
// garçom oferecendo ajuda na tela de pagamento é um garçom entre o cliente e o
// cartão.
//
// QUEM CHAMOU (tocou no orbe na tela inicial) é atendido desde o primeiro
// passo. Antes não era: a pessoa tocava no orbe e atravessava duas telas em
// silêncio — comer aqui ou levar, telefone — até o microfone abrir sozinho no
// cardápio. Ela chamava um garçom e ele aparecia depois de ela ter feito tudo
// no dedo. Agora ele cumprimenta no primeiro passo e conduz cada tela: responde
// "comer aqui ou levar" por ela (set_service_mode), oferece e pula a
// identificação (skip_identification), e chega no cardápio já conversando.
//
// A ORDEM É SEMPRE UMA PERGUNTA POR TELA. O que ele nunca faz é pedir telefone
// ou CPF em voz alta: quem digita dado pessoal na frente de uma fila é o dono
// dele, no teclado.
//
// A new visit gets a new waiter — the transport is torn down on `visitId`, so
// nothing a stranger said survives into the next person's order.
// ---------------------------------------------------------------------------

// As aberturas vêm do tenant: "Qual café você recomenda?" numa cafeteria e
// "Qual a mais pedida?" numa pizzaria não são a mesma pergunta.
import { activeWaiterPersona } from '@/waiter/persona'

/** Onde ainda faz sentido o cliente falar: até o pedido fechar, não depois. */
const TAKES_ORDERS = new Set<TotemStep>(['mode', 'identify', 'menu'])

export function Waiter() {
  const step = useTotemSession((s) => s.step)
  const visitId = useTotemSession((s) => s.visitId)
  const customerName = useTotemSession((s) => s.customer?.name ?? null)
  const engaged = useWaiter((s) => s.engaged)
  const presence = useWaiterPresence()
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
    if (!transport || !TAKES_ORDERS.has(step)) {
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

  // ---- o convite aceito na tela inicial, cobrado tela a tela -----------------
  //
  // `guided` guarda o último passo já narrado. Sem ele, qualquer re-render da
  // árvore recomeçaria o cumprimento — e um garçom que se apresenta duas vezes
  // é a coisa mais parecida com um defeito que existe.
  const guided = useRef<TotemStep | null>(null)
  useEffect(() => {
    guided.current = null
  }, [visitId])

  useEffect(() => {
    if (!transport || !engaged) return
    // Sem cardápio ele não tem o que dizer nem com o que responder. A espera é
    // curta (o prefetch começa no atrair) e a fala cai no passo em que a pessoa
    // estiver quando ele ficar pronto — por isso o cumprimento é escrito em
    // função do passo, e não do relógio.
    if (catalogState.status !== 'ready') return
    if (guided.current === step) return

    const first = guided.current === null
    guided.current = step

    if (first) {
      void transport.greet?.(greetingInstruction(customerName, step), catalogState.catalog)
      return
    }
    if (step === 'identify') announceToWaiter({ type: 'identification_open' })
    else if (step === 'menu') announceToWaiter({ type: 'menu_open' })
  }, [transport, engaged, step, catalogState, customerName, visitId])

  // A chegada ao pagamento é narrada para QUEM ESTIVER SENDO ATENDIDO, tenha
  // ele tocado no orbe da tela inicial ou pegado o microfone no meio do
  // cardápio. `announceToWaiter` se cala sozinho quando não há sessão de voz —
  // é o que mantém a tela de pagamento muda para quem pediu no dedo.
  const announcedPayment = useRef(false)
  useEffect(() => {
    announcedPayment.current = false
  }, [visitId])
  useEffect(() => {
    if (step !== 'payment' || announcedPayment.current) return
    announcedPayment.current = true
    announceToWaiter({ type: 'payment_open' })
  }, [step, visitId])

  if (!transport) return null

  // Onde a faixa aparece é decidido em `presence`, o mesmo lugar de onde as
  // telas tiram o espaço que precisam devolver. Dois lugares decidindo isso foi
  // o que pôs a faixa por cima do PIX.
  if (presence === 'off') return null

  return (
    <>
      <WaiterDock
        // As aberturas são do cardápio. Nas telas de uma pergunta só, uma
        // sugestão ao lado da pergunta é uma segunda pergunta — e no pagamento
        // é uma oferta de comida por cima do botão de pagar.
        suggestions={presence === 'ordering' ? activeWaiterPersona().suggestions : []}
        onSuggestion={send}
        invitation={presence === 'guiding' ? null : undefined}
        // A tela de "comer aqui ou levar" não tem barra de baixo; deixar a
        // faixa flutuando acima de uma faixa de nada é um degrau visível.
        bottom={step === 'mode' ? '0px' : 'var(--tap-bar)'}
      />
      {presence === 'ordering' ? <WaiterPanel onSend={send} /> : null}
    </>
  )
}
