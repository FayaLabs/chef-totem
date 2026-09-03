import { lastWaiterLine, useWaiter } from '@/waiter/useWaiter'
import { useTotemSession, type TotemStep } from '@/session/useTotemSession'
import { WAITER_DOCK_HEIGHT } from '@/waiter/WaiterDock'

// ---------------------------------------------------------------------------
// Onde a faixa do garçom aparece — decidido em UM lugar.
//
// Existia em dois: o `Waiter` decidia se renderizava, e cada tela decidia
// quanto espaço reservar. Os dois discordavam, e a discordância aparecia
// exatamente onde dói: a faixa surgia na tela de pagamento por cima da opção
// PIX, cortando um dos três meios de pagamento pela metade.
//
// Pior que o corte era o que ela dizia ali. Sem nenhuma fala para mostrar, a
// faixa caía no convite padrão — "Peça como pediria a Chef" — na tela em que o
// cliente já está com o cartão na mão. Um convite para pedir mais comida em
// cima do botão de pagar é o oposto do que este painel promete.
//
// Agora a presença tem quatro estados e uma regra por passo:
//
//   ordering  cardápio — toma o pedido, com microfone e aberturas
//   leading   antes do cardápio, SÓ para quem tocou no orbe — conduz a tela
//   guiding   pagamento e recibo — só acompanha, e só se tiver o que dizer
//   off       não aparece
// ---------------------------------------------------------------------------

export type WaiterPresence = 'off' | 'ordering' | 'leading' | 'guiding'

export function useWaiterPresence(): WaiterPresence {
  const step = useTotemSession((s) => s.step)
  const phase = useWaiter((s) => s.phase)
  const engaged = useWaiter((s) => s.engaged)
  const turns = useWaiter((s) => s.turns)
  const error = useWaiter((s) => s.error)
  return presenceFor(step, phase === 'off', engaged, Boolean(error) || Boolean(lastWaiterLine(turns)))
}

export function presenceFor(
  step: TotemStep,
  off: boolean,
  engaged: boolean,
  hasLine: boolean,
): WaiterPresence {
  if (off) return 'off'
  if (step === 'menu') return 'ordering'
  // Antes do cardápio ele só existe para quem o chamou. Uma faixa de garçom na
  // tela de "comer aqui ou levar" de quem escolheu pedir no dedo é ruído em
  // cima de uma pergunta de duas opções.
  if (step === 'mode' || step === 'identify') return engaged ? 'leading' : 'off'
  // No pagamento e no recibo ele não se anuncia: aparece se — e só se — tiver
  // uma frase sobre ESTA tela. Quem nunca falou com ele não tem sessão de voz
  // aberta, o anúncio da tela cai no vazio, não há frase — e não há faixa.
  //
  // Repare que aqui NÃO se olha `engaged`. O cliente que só tocou no microfone
  // no meio do cardápio também está sendo atendido, e cortar a orientação da
  // maquininha dele por ele não ter tocado no orbe lá na tela inicial seria
  // punir quem mudou de ideia no caminho.
  if (step === 'payment' || step === 'receipt') return hasLine ? 'guiding' : 'off'
  return 'off'
}

/**
 * Quanto a faixa come do rodapé desta tela, para a tela devolver em padding.
 *
 * A faixa é cromo, não sobreposição: quem rola por baixo dela perde a última
 * linha, e a última linha de uma tela de pagamento é uma forma de pagar.
 */
export function useWaiterDockInset(): string {
  return useWaiterPresence() === 'off' ? '0px' : WAITER_DOCK_HEIGHT
}
