// ---------------------------------------------------------------------------
// O espectro que o globo desenha.
//
// Isto NÃO passa pelo zustand de propósito. A FFT anda a 60fps; empurrar 32
// números por quadro para dentro de um store faz o React re-renderizar o dock,
// a barra e o cardápio inteiro sessenta vezes por segundo, e o painel some numa
// tela de 27". O canvas lê daqui direto no seu próprio rAF, e o store só recebe
// um `level` grosso, algumas vezes por segundo, para quem precisa de estado.
//
// Duas fontes, uma de cada vez: o microfone enquanto o cliente fala, e o áudio
// que volta da OpenAI enquanto o garçom fala. É o que faz o globo pulsar com a
// VOZ que está no ar em vez de animar sozinho — a diferença entre um feedback
// e uma decoração.
// ---------------------------------------------------------------------------

const BINS = 32
/** Só a faixa da voz humana interessa; o resto do espectro é sala. */
const FFT_SIZE = 512

interface Source {
  context: AudioContext
  analyser: AnalyserNode
  node: AudioNode
  raw: Uint8Array<ArrayBuffer>
}

let source: Source | null = null

function make(context: AudioContext, node: AudioNode): Source {
  const analyser = context.createAnalyser()
  analyser.fftSize = FFT_SIZE
  // Sem suavização o globo treme; com suavização demais ele não acompanha a
  // sílaba. 0.7 é o ponto onde a boca da pessoa e a forma na tela batem.
  analyser.smoothingTimeConstant = 0.7
  node.connect(analyser)
  return { context, analyser, node, raw: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)) }
}

/** O microfone do cliente. */
export function meterMicrophone(stream: MediaStream): void {
  detach()
  const context = new AudioContext()
  source = make(context, context.createMediaStreamSource(stream))
}

/**
 * A voz do garçom, vinda do WebRTC.
 *
 * O elemento de áudio continua tocando pelos alto-falantes: `createMediaStreamSource`
 * sobre o stream remoto só o observa, não o desvia. Ligar o analyser à saída do
 * contexto duplicaria o som.
 */
export function meterRemote(stream: MediaStream): void {
  detach()
  const context = new AudioContext()
  source = make(context, context.createMediaStreamSource(stream))
}

export function detach(): void {
  if (!source) return
  try {
    source.node.disconnect()
    void source.context.close()
  } catch {
    // Fechar um contexto já fechado não é um problema que valha um log.
  }
  source = null
}

/**
 * Preenche `out` (32 posições, 0..1) com o espectro atual.
 * Devolve `false` quando não há nada tocando — o globo então respira sozinho.
 */
export function readSpectrum(out: Float32Array): boolean {
  if (!source) return false
  source.analyser.getByteFrequencyData(source.raw)

  // A FFT dá 256 bins até ~11kHz; a voz vive nos primeiros ~40%. Espremer o
  // espectro inteiro em 32 barras deixaria dois terços do globo parados.
  const usable = Math.floor(source.raw.length * 0.42)
  const per = Math.max(1, Math.floor(usable / BINS))

  for (let i = 0; i < BINS; i++) {
    let sum = 0
    for (let j = 0; j < per; j++) sum += source.raw[i * per + j] ?? 0
    out[i] = sum / per / 255
  }
  return true
}

/** Um número só, 0..1 — o que o store guarda e o que o orbe usa para inchar. */
export function currentLevel(): number {
  if (!source) return 0
  source.analyser.getByteFrequencyData(source.raw)
  const usable = Math.floor(source.raw.length * 0.42)
  let sum = 0
  for (let i = 0; i < usable; i++) sum += source.raw[i]
  return Math.min(1, sum / usable / 160)
}

export const SPECTRUM_BINS = BINS
