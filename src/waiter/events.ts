import { useWaiter } from '@/waiter/useWaiter'
import type { TotemStep } from '@/session/useTotemSession'

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
  | { type: 'identification_open' }
  | { type: 'menu_open' }
  | { type: 'payment_open' }
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
    case 'identification_open':
      return 'A tela agora oferece telefone ou CPF, e tem um botão "Agora não". Diga em UMA frase que, se ele for cliente, o telefone traz crédito e manda o recibo — e que dá para pular. NÃO peça o número em voz alta e não repita dígito nenhum: quem digita é ele. Se ele recusar ou disser para seguir, chame skip_identification.'
    case 'menu_open':
      return 'O cardápio está na tela. Você JÁ cumprimentou — não cumprimente de novo. Uma frase perguntando o que ele vai querer, ou oferecendo o carro-chefe.'
    case 'payment_open':
      return 'O cliente chegou na tela de pagamento e vê cartão, Pix e dinheiro. UMA frase pedindo para ele escolher como quer pagar. Não ofereça nada, não sugira sobremesa, não puxe assunto: daqui em diante você só acompanha.'
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
 * A primeira frase da visita, quando o cliente pediu para ser atendido falando.
 *
 * Não passa por `announce`: naquele instante não existe sessão de voz nenhuma
 * — é este texto que abre a conexão junto com o microfone (ver `greet` no
 * transporte). É também a única fala do garçom que o cliente não pediu, e por
 * isso ela faz UMA pergunta e para.
 */
export function greetingInstruction(customerName: string | null, step: TotemStep): string {
  // A pergunta vem do passo em que o cliente ESTÁ, não do passo em que ele
  // estava quando tocou no orbe. O cardápio pode demorar a chegar, e um garçom
  // que se apresenta perguntando "aqui ou para levar" depois de a pessoa já ter
  // respondido no dedo é um garçom que não estava olhando.
  const question =
    step === 'mode'
      ? 'pergunte se é para comer aqui ou para levar — a tela mostra as duas opções, e se ele responder falando chame set_service_mode você mesmo'
      : step === 'identify'
        ? 'diga que, se ele for cliente, o telefone traz crédito e manda o recibo, e que dá para pular; se ele recusar, chame skip_identification. Não peça o número em voz alta'
        : 'pergunte o que ele vai querer'
  return [
    'O cliente tocou no orbe para ser atendido FALANDO. Esta é a sua primeira frase da visita.',
    customerName ? `Ele é ${customerName} — chame pelo nome.` : 'Você ainda não sabe o nome dele.',
    `Cumprimente em uma frase, diga seu nome, e ${question}.`,
    'Nada de lista, nada de explicar o painel. Uma frase e a pergunta.',
  ].join(' ')
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
