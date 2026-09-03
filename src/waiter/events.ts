import { useWaiter } from '@/waiter/useWaiter'

// ---------------------------------------------------------------------------
// O que aconteceu na tela, dito por quem está atendendo.
//
// Até aqui o garçom só falava quando lhe falavam. Um garçom de salão não é
// assim: ele avisa que a maquininha já pode receber o cartão, e diz que o
// pedido saiu. Num totem isso vale mais ainda, porque o cliente está de pé,
// muitas vezes sem óculos, olhando para um painel a um metro de distância — a
// instrução falada chega antes da lida.
//
// O QUE ISTO NÃO É: um gatilho para vender. Nada aqui dispara na tela de
// pagamento uma sugestão de sobremesa. O garçom acompanha; ele não atravessa o
// cliente e o cartão.
//
// COMO FUNCIONA: a tela emite um EVENTO, não uma frase. Quem escreve a frase é
// o modelo, com a voz do tenant — o Téo diz "encosta o cartão aí" e a Bia diz
// "pode aproximar quando quiser". Uma tabela de frases fixas aqui apagaria a
// persona que o resto do sistema constrói.
// ---------------------------------------------------------------------------

export type WaiterEvent =
  | { type: 'payment_method_chosen'; method: 'card' | 'pix' | 'cash' }
  | { type: 'payment_awaiting_card' }
  | { type: 'payment_processing' }
  | { type: 'payment_declined'; reason: string }
  | { type: 'order_placed'; ticket: string; mode: 'dine_in' | 'takeaway' }
  | { type: 'order_failed'; reference: string }

/**
 * O evento em palavras que o modelo entende, com o que ele deve dizer.
 *
 * É uma INSTRUÇÃO, não uma fala: quem escolhe as palavras é ele. Cada linha diz
 * o fato e o objetivo, e para de falar — dizer a frase pronta aqui seria a
 * mesma coisa que não ter persona.
 */
export function describeEvent(event: WaiterEvent): string {
  switch (event.type) {
    case 'payment_method_chosen':
      return event.method === 'card'
        ? 'O cliente escolheu CARTÃO. Diga em uma frase que ele pode aproximar, inserir ou passar na maquininha ao lado do painel.'
        : event.method === 'pix'
          ? 'O cliente escolheu PIX. Diga em uma frase que o QR code aparece na tela depois que ele tocar em pagar.'
          : 'O cliente escolheu DINHEIRO. Diga em uma frase que o pagamento é no caixa e que a senha sai aqui do mesmo jeito.'
    case 'payment_awaiting_card':
      return 'A maquininha está esperando o cartão AGORA. Uma frase curta pedindo para aproximar ou inserir.'
    case 'payment_processing':
      return 'A maquininha está processando. Uma frase curta pedindo um instante. Não repita se você já disse.'
    case 'payment_declined':
      return `O pagamento NÃO foi aprovado (${event.reason}). Uma frase calma dizendo o que houve e que ele pode tentar de novo ou trocar de forma. Não culpe o cliente.`
    case 'order_placed':
      return `Pedido confirmado, senha ${event.ticket}. Uma frase: a senha dele e ${
        event.mode === 'takeaway'
          ? 'que é só esperar chamarem no balcão'
          : 'que é para levar a senha até a mesa'
      }. Termine se despedindo — a conversa acabou aqui.`
    case 'order_failed':
      return `O pagamento passou mas o pedido NÃO gravou. Código ${event.reference}. Uma frase mandando procurar o caixa com esse código. Isto é sério: nada de "tente de novo".`
  }
}

/**
 * Avisa o garçom. Silencioso quando ele não está de plantão.
 *
 * A tela chama isto e segue a vida: se não há assistente, ou se o transporte
 * não sabe anunciar, nada acontece e nada quebra. Um painel que dependesse do
 * assistente para explicar a maquininha seria um painel que para de vender
 * quando a OpenAI cai.
 */
export function announceToWaiter(event: WaiterEvent): void {
  const { phase, announce } = useWaiter.getState()
  if (phase === 'off' || !announce) return
  announce(describeEvent(event))
}
