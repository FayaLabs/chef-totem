import { useEffect } from 'react'
import { VoiceOrb } from '@/waiter/VoiceOrb'
import { useWaiter } from '@/waiter/useWaiter'

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

  const busy = phase === 'thinking' || phase === 'speaking'

  return (
    <button
      type="button"
      data-testid="talk-button"
      aria-label={listening ? 'Parar de falar' : 'Falar com o assistente'}
      aria-pressed={listening}
      disabled={busy}
      onClick={listening ? controls.stop : controls.start}
      className="grid size-[var(--tap-lg)] shrink-0 place-items-center rounded-full disabled:opacity-60"
    >
      <VoiceOrb size="var(--tap-lg)" />
    </button>
  )
}
