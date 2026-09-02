import { useEffect, useRef } from 'react'
import { readSpectrum, SPECTRUM_BINS } from '@/waiter/audio-meter'
import { useWaiter, type WaiterPhase } from '@/waiter/useWaiter'

// ---------------------------------------------------------------------------
// O globo.
//
// Não é enfeite. Num salão barulhento o cliente não distingue um painel que
// está ouvindo de um que travou, e essa dúvida é o que faz a pessoa desistir e
// entrar na fila do caixa. O globo responde uma pergunta, continuamente: é a
// minha vez de falar ou a dele?
//
// O contorno é deformado pela FFT REAL — a voz que está no ar naquele
// milissegundo, do microfone enquanto o cliente fala e do áudio da OpenAI
// enquanto o garçom responde. Uma animação que roda sozinha em loop mente
// exatamente na hora em que o cliente mais precisa da verdade: quando ele fala
// e nada é captado.
//
// Canvas e não SVG porque são 60 quadros por segundo de caminho redesenhado; e
// o loop lê o espectro direto do medidor, sem passar pelo React (ver
// audio-meter.ts).
//
// Sob `prefers-reduced-motion` o globo para de girar e de ondular, e a COR
// passa a carregar o estado sozinha — por isso as cores são diferentes por
// fase, não só as animações.
// ---------------------------------------------------------------------------

/** Quanto o contorno pode se afastar do círculo, em fração do raio. */
const MAX_WOBBLE = 0.3

/**
 * Três manchas de cor por fase, mais o aro.
 *
 * TRÊS e não uma: uma esfera de uma cor só é um botão redondo. O que faz o
 * orbe do ChatGPT parecer matéria viva é ter cores que se atravessam por
 * dentro, cada uma girando no seu tempo — e isso não é um degradê, é um
 * empilhamento com `lighter`, que é como duas luzes se somam no mundo real.
 *
 * OUVINDO NÃO É VERMELHO, e essa é uma decisão contra a convenção. Vermelho é a
 * cor de gravar em todo lugar — mas neste painel o vermelho já é o FINALIZAR, e
 * o orbe fica encostado nele na barra. Dois vermelhos lado a lado, um que cobra
 * e outro que escuta, é o tipo de colisão que se paga no caixa.
 */
interface Palette {
  blobs: [string, string, string]
  rim: string
  /** Quanto o orbe brilha por conta própria, antes de qualquer som. */
  glow: number
}

const HUE: Record<WaiterPhase, Palette> = {
  off: { blobs: ['#27272A', '#18181B', '#0B0B0C'], rim: '#3F3F46', glow: 0 },
  idle: { blobs: ['#6366F1', '#7C3AED', '#2563EB'], rim: '#818CF8', glow: 0.35 },
  listening: { blobs: ['#22D3EE', '#0EA5E9', '#2DD4BF'], rim: '#67E8F9', glow: 0.8 },
  thinking: { blobs: ['#FBBF24', '#F97316', '#F59E0B'], rim: '#FCD34D', glow: 0.6 },
  speaking: { blobs: ['#A78BFA', '#F472B6', '#818CF8'], rim: '#C4B5FD', glow: 0.75 },
  error: { blobs: ['#F87171', '#DC2626', '#B91C1C'], rim: '#FCA5A5', glow: 0.5 },
}

export function VoiceOrb({ size = 'var(--tap-lg)' }: { size?: string }) {
  const phase = useWaiter((s) => s.phase)
  const canvas = useRef<HTMLCanvasElement>(null)
  // Lido dentro do rAF: fechar sobre o valor de `phase` congelaria a cor no que
  // ela era quando o loop começou.
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const ctx = element.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const spectrum = new Float32Array(SPECTRUM_BINS)
    // Suavização própria, além da do analyser: sem ela a silhueta pisca entre
    // quadros em que a pessoa respira.
    const smoothed = new Float32Array(SPECTRUM_BINS)
    let raf = 0
    let t = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const css = element.clientWidth
      if (css === 0) return
      if (element.width !== Math.round(css * dpr)) {
        element.width = Math.round(css * dpr)
        element.height = Math.round(css * dpr)
      }

      const w = element.width
      const h = element.height
      ctx.clearRect(0, 0, w, h)

      const current = phaseRef.current
      if (current === 'off') return

      const live = readSpectrum(spectrum)
      let energy = 0
      for (let i = 0; i < SPECTRUM_BINS; i++) {
        // Quando não há som, o alvo é uma onda lenta: o globo respira em vez de
        // ficar um disco morto, e a diferença entre respirar e reagir continua
        // óbvia porque a amplitude é uma ordem de grandeza menor.
        const target = live
          ? spectrum[i]
          : reduced
            ? 0
            : 0.06 + 0.04 * Math.sin(t * 0.9 + i * 0.5)
        smoothed[i] += (target - smoothed[i]) * 0.28
        energy += smoothed[i]
      }
      energy /= SPECTRUM_BINS

      if (!reduced) t += 0.016

      const cx = w / 2
      const cy = h / 2
      const base = Math.min(w, h) * 0.5 * (0.64 + Math.min(0.14, energy * 0.45))

      // O contorno: cada ângulo puxa de um bin, espelhado para que a forma seja
      // simétrica e pareça um objeto e não um gráfico.
      ctx.beginPath()
      const steps = 96
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2
        const half = Math.floor((i / steps) * SPECTRUM_BINS * 2) % (SPECTRUM_BINS * 2)
        const bin = half < SPECTRUM_BINS ? half : SPECTRUM_BINS * 2 - 1 - half
        const wobble = smoothed[bin] * MAX_WOBBLE
        const spin = reduced ? 0 : Math.sin(angle * 3 + t * 1.6) * 0.015
        const r = base * (1 + wobble + spin)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      const palette = HUE[current]

      // Fundo escuro do corpo. Sem ele as manchas somadas com `lighter` viram
      // um borrão claro em cima da barra branca e o orbe perde a silhueta.
      ctx.save()
      ctx.clip()
      ctx.fillStyle = '#0A0A12'
      ctx.fillRect(0, 0, w, h)

      // As três manchas, somando luz. Cada uma orbita num raio e numa velocidade
      // diferentes, então o padrão nunca se repete de forma que o olho perceba —
      // que é a diferença entre "animado" e "em loop".
      ctx.globalCompositeOperation = 'lighter'
      const push = 0.22 + energy * 0.55
      palette.blobs.forEach((color, index) => {
        const speed = 0.24 + index * 0.11
        const phaseOffset = (index * Math.PI * 2) / 3
        const orbit = base * (0.2 + index * 0.06) * (reduced ? 0.4 : 1)
        const bx = cx + Math.cos(t * speed + phaseOffset) * orbit
        const by = cy + Math.sin(t * speed * 1.3 + phaseOffset) * orbit
        const r = base * (0.62 + push * 0.35)

        const blob = ctx.createRadialGradient(bx, by, 0, bx, by, r)
        blob.addColorStop(0, color)
        blob.addColorStop(0.45, `${color}88`)
        blob.addColorStop(1, `${color}00`)
        ctx.fillStyle = blob
        ctx.beginPath()
        ctx.arc(bx, by, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Vinheta: escurece a borda por dentro. É o que devolve a forma de esfera
      // depois que as manchas lavaram o centro.
      ctx.globalCompositeOperation = 'source-over'
      const vignette = ctx.createRadialGradient(cx, cy, base * 0.45, cx, cy, base)
      vignette.addColorStop(0, 'rgba(10,10,18,0)')
      vignette.addColorStop(1, 'rgba(10,10,18,0.72)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)

      // Brilho especular no alto — a luz da sala batendo no vidro.
      const lx = cx - base * 0.3
      const ly = cy - base * 0.36
      const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, base * 0.55)
      spec.addColorStop(0, 'rgba(255,255,255,0.55)')
      spec.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(0, 0, w, h)
      ctx.restore()

      // O aro. Fora do corpo, e é ele que carrega a fase sozinho quando a
      // animação está desligada — por isso a cor muda, não só o movimento.
      ctx.save()
      ctx.globalAlpha = 0.45 + energy * 0.5
      ctx.strokeStyle = palette.rim
      ctx.lineWidth = Math.max(1.5, base * 0.055)
      ctx.stroke()
      ctx.restore()

      // Halo externo. Cresce com a voz: é o sinal que se lê de dois metros,
      // antes de qualquer texto.
      if (palette.glow > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = (palette.glow * 0.28) + energy * 0.4
        const halo = ctx.createRadialGradient(cx, cy, base * 0.9, cx, cy, base * 1.5)
        halo.addColorStop(0, palette.rim)
        halo.addColorStop(1, `${palette.rim}00`)
        ctx.fillStyle = halo
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
      }
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <span
      data-testid="voice-orb"
      data-phase={phase}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvas} aria-hidden className="size-full" />
    </span>
  )
}
