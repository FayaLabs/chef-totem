import { useEffect } from 'react'
import { Square } from 'lucide-react'
import { VoiceOrb } from '@/waiter/VoiceOrb'
import { talkAction, useWaiter } from '@/waiter/useWaiter'

// ---------------------------------------------------------------------------
// O assistente, na faixa do garçom.
//
// Vive na faixa do garçom (ver WaiterDock), à esquerda da frase que ele está
// dizendo. Passou pela barra de baixo antes; lá era um círculo solto ao lado de
// "CARRINHO", pertencendo a nada. Aqui ele é a cara de quem fala.
//
// TOCA E FALA, não segura e fala. O push-to-talk protegia contra microfone
// aberto, mas custava caro no lugar errado: manter o dedo num botão enquanto se
// pensa no pedido é desconfortável, e um dedo que escorrega corta a frase no
// meio. O microfone agora abre num toque e fecha no toque seguinte — ou sozinho
// em MAX_LISTEN_MS.
//
// Isso NÃO é um microfone aberto. Ele só abre por um ato deliberado, o estado
// está na tela o tempo todo (o orbe fica ciano e pulsa com a voz), e a janela é
// limitada. A mesa ao lado continua não sendo gravada.
//
// E ELE SEMPRE PARA. Enquanto o garçom conectava, pensava ou falava, este botão
// ficava DESABILITADO — então uma sessão que começasse a falar besteira só
// terminava fechando a aplicação, na frente da fila. Agora o mesmo controle
// muda de sentido conforme a fase (ver `talkAction`): fala, cala o microfone,
// ou DERRUBA a sessão inteira. O ícone muda junto, porque um botão que faz
// outra coisa tem de parecer outra coisa.
// ---------------------------------------------------------------------------

/** Teto da escuta. Ninguém pede um lanche em vinte segundos de fala contínua. */
const MAX_LISTEN_MS = 20_000

export function TalkButton() {
  const phase = useWaiter((s) => s.phase)
  const controls = useWaiter((s) => s.controls)
  const listening = phase === 'listening'

  // O corte automático. Sem ele, um cliente que toca e vai embora deixa o
  // microfone ligado para o próximo da fila.
  useEffect(() => {
    if (!listening || !controls) return
    const timer = setTimeout(controls.stop, MAX_LISTEN_MS)
    return () => clearTimeout(timer)
  }, [listening, controls])

  if (phase === 'off' || !controls) return null

  const action = talkAction(phase)
  if (!action) return null

  const stops = action === 'end'
  // Abrir a sessão é o único momento "parado" da fase: ninguém falou ainda, e a
  // pergunta do cliente é "carregou ou travou?". O orbe já responde isso — é
  // exatamente o estado `thinking` da lib, churn alto e silhueta parada — e o
  // quadrado branco, com 35% do botão, cobria justo a animação que responde.
  const connecting = phase === 'connecting'
  const label =
    action === 'stop-listening'
      ? 'Parar de falar'
      : stops
        ? 'Parar o assistente'
        : 'Falar com o assistente'

  return (
    <button
      type="button"
      data-testid="talk-button"
      data-action={action}
      aria-label={label}
      aria-pressed={listening}
      onClick={action === 'stop-listening' ? controls.stop : stops ? controls.end : controls.start}
      className="press relative grid size-[var(--tap-lg)] shrink-0 place-items-center rounded-full"
    >
      <VoiceOrb size="var(--tap-lg)" />
      {/* O quadrado de parar, por cima do orbe. Sem ele o botão continua
          parecendo "fale comigo" exatamente quando faz o contrário — e quem
          está tentando calar o painel não tem tempo de descobrir isso tocando.

          Só depois que o garçom começa a trabalhar: enquanto conecta, o toque
          continua derrubando a sessão, mas quem está esperando precisa ver o
          orbe, não um botão de parar algo que ainda não começou. */}
      {stops && !connecting ? (
        <Square
          data-testid="talk-stop"
          strokeWidth={0}
          className="pointer-events-none absolute size-[35%] fill-white drop-shadow-[0_0_0.4cqw_rgba(0,0,0,0.45)]"
        />
      ) : null}
    </button>
  )
}
