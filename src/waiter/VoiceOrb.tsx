import { useEffect } from 'react'
import { useMotionValue } from 'motion/react'
import { currentLevel } from '@/waiter/audio-meter'
import { useWaiter, type WaiterPhase } from '@/waiter/useWaiter'
import SiriOrb from '@/vendor/smoothui/siri-orb'
import type { AIState } from '@/vendor/smoothui/ai-core'

// ---------------------------------------------------------------------------
// O orbe.
//
// Não é enfeite. Num salão barulhento o cliente não distingue um painel que
// está ouvindo de um que travou, e essa dúvida é o que faz a pessoa desistir e
// entrar na fila do caixa. O orbe responde uma pergunta, continuamente: é a
// minha vez de falar ou a dele?
//
// O DESENHO é do SiriOrb do SmoothUI (src/vendor/smoothui), não nosso. Duas
// versões próprias foram escritas antes — canvas 2D e depois um shader WebGL —
// e as duas pareciam o que eram: uma pessoa desenhando um orbe. O material
// deste é um mesh gradient animado, com o mesmo contrato de estado que já
// tínhamos (idle / listening / thinking / streaming / error) e com a amplitude
// entrando como MotionValue, ou seja, sem re-renderizar React.
//
// O QUE CONTINUA NOSSO é a única parte que o componente não podia saber: de
// onde vem o som. A amplitude sai do nosso medidor, que ouve o MICROFONE
// enquanto o cliente fala e o ÁUDIO DA OPENAI enquanto o garçom responde. Um
// orbe que só reage ao microfone fica morto justamente quando está falando.
// ---------------------------------------------------------------------------

/** A nossa fase, no vocabulário do componente. */
const AS_STATE: Record<WaiterPhase, AIState> = {
  off: 'idle',
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  // "streaming" é como o SmoothUI chama o turno em que a IA está produzindo.
  speaking: 'streaming',
  error: 'error',
}

// Roxo/ciano da marca do painel, não o azul padrão do componente. `bg` fica
// escuro porque o orbe mora sobre a barra branca: um orbe claro sobre branco
// perde a silhueta, e a silhueta é o que se lê de dois metros.
const COLORS = { bg: '#0B0B14', c1: '#4F46E5', c2: '#22D3EE', c3: '#A78BFA', c4: '#2563EB' }

/**
 * Teto da amplitude.
 *
 * O componente converte amplitude em até +12% de tamanho, e a troca de estado
 * já move a escala em ~13% por conta própria. Somados sem teto, um "toquei no
 * orbe" virava um salto de 26% em 250ms — que foi exatamente a queixa. O teto
 * corta a metade que é nossa; a outra metade é o pop deliberado do componente,
 * e ele é útil: é o que confirma que o toque foi registrado.
 */
const AMPLITUDE_CEILING = 0.6

/** Quanto tempo a amplitude leva para entrar depois de uma troca de estado. */
const RAMP_MS = 420

export function VoiceOrb({ size = 'var(--tap-lg)' }: { size?: string }) {
  const phase = useWaiter((s) => s.phase)
  const amplitude = useMotionValue(0)

  // A FFT anda a 60fps. Escrever isso num MotionValue não re-renderiza nada —
  // é exatamente por isso que o componente aceita MotionValue em vez de number.
  useEffect(() => {
    let raf = 0
    let smoothed = 0
    const changedAt = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const target = phase === 'off' ? 0 : currentLevel() * AMPLITUDE_CEILING

      // Sem suavização o orbe pisca a cada sílaba e parece nervoso em vez de
      // atento; com suavização demais ele não acompanha a fala.
      smoothed += (target - smoothed) * 0.22

      // A rampa só existe logo depois da troca de fase. O microfone entra com
      // energia total no primeiro quadro em que abre, e essa entrada instantânea
      // chegava na tela ao mesmo tempo que o pop da mudança de estado.
      const ramp = Math.min(1, (now - changedAt) / RAMP_MS)
      amplitude.set(Math.min(1, smoothed) * ramp * ramp)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [amplitude, phase])

  return (
    <span
      data-testid="voice-orb"
      data-phase={phase}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <SiriOrb size="100%" state={AS_STATE[phase]} amplitude={amplitude} colors={COLORS} />
    </span>
  )
}
