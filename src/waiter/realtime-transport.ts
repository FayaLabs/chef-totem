import { detach, meterMicrophone, meterRemote, currentLevel } from '@/waiter/audio-meter'
import { executeWaiterTool, WAITER_TOOLS } from '@/waiter/tools'
import { buildSnapshot } from '@/waiter/snapshot'
import { waiterContext, waiterInstructions } from '@/waiter/instructions'
import { useWaiter } from '@/waiter/useWaiter'
import { activeWaiterPersona } from '@/waiter/persona'
import type { WaiterTransport } from '@/waiter/transport'
import type { TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// A voz, por WebRTC, contra a Realtime API da OpenAI.
//
// Três decisões que valem mais que o código:
//
// 1. O SERVIDOR DECIDE QUANDO A FRASE ACABOU (`semantic_vad`), não o dedo.
//    Antes era push-to-talk: `turn_detection: null` e um `commit` manual no
//    soltar do botão. Protegia contra microfone aberto, e cobrava caro por
//    isso — quem fala com um totem faz pausa para pensar no meio do pedido, e
//    cada pausa virava "ele já mandou?".
//
//    `semantic_vad` não corta na pausa: ele julga se a FRASE terminou, e é a
//    diferença entre um garçom que espera você acabar e um que atropela.
//
//    O microfone continua não sendo aberto por padrão. Ele abre num toque no
//    orbe, fecha no toque seguinte, e a sessão inteira morre no fim da visita —
//    o que a mesa ao lado nunca consentiu foi ser gravada sem ninguém pedir,
//    não a conversa de quem tocou no botão.
//
// 2. A CHAVE NUNCA CHEGA AQUI. O painel pede um segredo efêmero de 60s à edge
//    function `totem-voice-token`, autenticado como o aparelho. Uma chave de
//    plataforma no bundle de um totem de praça de alimentação é a conta inteira
//    exposta ao DevTools de qualquer celular.
//
// 3. AS FERRAMENTAS SÃO AS MESMAS do garçom escrito — `WAITER_TOOLS`, sem
//    exceção e sem uma versão "de voz". É o que garante que falar e digitar
//    façam a mesma coisa, e é por isso que continua não existindo ferramenta
//    que pague.
// ---------------------------------------------------------------------------

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls'
const DEFAULT_MODEL = 'gpt-realtime-2.1'

/** Com que frequência o `level` grosso sobe para o store (o globo lê a FFT
 *  direto; isto é só para quem precisa de estado). */
const LEVEL_MS = 100

interface TokenResponse {
  value?: string
  model?: string
  error?: string
}

function toolSchemas() {
  return WAITER_TOOLS.map((tool) => ({
    type: 'function' as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }))
}

async function mintToken(instructions: string): Promise<{ key: string; model: string }> {
  const base = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!base || !anon) throw new Error('Totem sem VITE_SUPABASE_URL/PUBLISHABLE_KEY.')

  // A sessão do aparelho já existe (é a mesma que lê o cardápio). Reaproveitá-la
  // aqui é o que faz `verify_jwt` valer alguma coisa na função.
  const { deviceClient } = await import('@/menu/device-session')
  const supabase = await deviceClient()
  const { data } = await supabase.auth.getSession()
  const jwt = data.session?.access_token
  if (!jwt) throw new Error('Aparelho sem sessão para pedir a voz.')

  const res = await fetch(`${base}/functions/v1/totem-voice-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions }),
  })
  const body = (await res.json().catch(() => ({}))) as TokenResponse
  if (!res.ok || !body.value) {
    throw new Error(body.error ? `voz indisponível (${body.error})` : `voz indisponível (${res.status})`)
  }
  return { key: body.value, model: body.model ?? DEFAULT_MODEL }
}

export function createRealtimeTransport(): WaiterTransport {
  let pc: RTCPeerConnection | null = null
  let channel: RTCDataChannel | null = null
  let mic: MediaStream | null = null
  let audio: HTMLAudioElement | null = null
  let levelTimer: ReturnType<typeof setInterval> | null = null
  let connecting: Promise<void> | null = null
  let catalogRef: TotemCatalog | null = null
  /** Turno do garçom sendo transcrito agora — para colar os deltas nele. */
  let speakingTurnId: string | null = null

  const store = () => useWaiter.getState()

  const send = (payload: unknown) => {
    if (channel?.readyState === 'open') channel.send(JSON.stringify(payload))
  }

  const startLevelPump = () => {
    if (levelTimer) return
    levelTimer = setInterval(() => store().setLevel(currentLevel()), LEVEL_MS)
  }

  const handleEvent = (event: Record<string, unknown>) => {
    const type = String(event.type ?? '')

    // ---- o que o cliente está dizendo ---------------------------------------
    if (type === 'conversation.item.input_audio_transcription.delta') {
      store().setLive(store().liveTranscript + String(event.delta ?? ''))
      return
    }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = String(event.transcript ?? '').trim()
      store().setLive('')
      if (text) store().pushTurn({ id: `c-${Date.now()}`, from: 'customer', text })
      return
    }

    // ---- o que o garçom está dizendo ----------------------------------------
    if (type === 'response.output_audio_transcript.delta') {
      const delta = String(event.delta ?? '')
      if (!speakingTurnId) {
        speakingTurnId = `w-${Date.now()}`
        store().pushTurn({ id: speakingTurnId, from: 'waiter', text: delta, partial: true })
      } else {
        const turn = store().turns.find((t) => t.id === speakingTurnId)
        store().updateTurn(speakingTurnId, { text: (turn?.text ?? '') + delta })
      }
      return
    }
    if (type === 'response.output_audio_transcript.done') {
      if (speakingTurnId) store().updateTurn(speakingTurnId, { partial: false })
      speakingTurnId = null
      return
    }

    // ---- ferramentas ---------------------------------------------------------
    if (type === 'response.function_call_arguments.done') {
      const name = String(event.name ?? '')
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(String(event.arguments ?? '{}'))
      } catch {
        // Argumentos ilegíveis viram uma chamada sem argumentos; a ferramenta
        // responde o que falta e o modelo tenta de novo. Melhor que travar.
      }
      const output = catalogRef
        ? executeWaiterTool(name, args, catalogRef)
        : 'O cardápio ainda não carregou.'

      // O rastro do que ele FEZ, não só do que disse. É o que deixa o cliente
      // conferir se o garçom entendeu — e é a mesma linha que o garçom escrito
      // mostra.
      if (speakingTurnId) {
        const turn = store().turns.find((t) => t.id === speakingTurnId)
        store().updateTurn(speakingTurnId, { did: [...(turn?.did ?? []), name] })
      }

      send({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: String(event.call_id ?? ''),
          output,
        },
      })
      // Depois de mexer na tela, o estado mudou; o modelo precisa do novo
      // retrato antes de decidir a próxima frase.
      send({ type: 'response.create' })
      return
    }

    // ---- fases ---------------------------------------------------------------
    // Com VAD do servidor, é ELE quem sabe que a pessoa começou e parou de
    // falar. Sem estes dois, o orbe ficaria "ouvindo" durante a resposta.
    if (type === 'input_audio_buffer.speech_started') {
      // Enquanto o garçom fala, o que o microfone capta é quase sempre o
      // próprio alto-falante ou o salão. Trocar a fase aqui faria o orbe piscar
      // "ouvindo" no meio da frase dele — e o orbe é a única coisa na tela que
      // diz de quem é a vez.
      if (store().phase === 'speaking') return
      store().setLive('')
      return store().setPhase('listening')
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      if (store().phase === 'speaking') return
      return store().setPhase('thinking')
    }
    if (type === 'response.created') return store().setPhase('thinking')
    if (type === 'output_audio_buffer.started') return store().setPhase('speaking')
    if (type === 'response.done' || type === 'output_audio_buffer.stopped') {
      // Terminou de falar e o microfone continua aberto: volta a ESCUTAR, não a
      // repouso. Num diálogo, o silêncio depois da resposta é a vez do cliente.
      const stillOpen = mic?.getAudioTracks().some((track) => track.enabled) ?? false
      store().setPhase(stillOpen ? 'listening' : 'idle')
      return
    }
    if (type === 'error') {
      const message =
        (event.error as { message?: string } | undefined)?.message ?? 'a voz falhou'
      store().setError(message)
    }
  }

  const configure = (catalog: TotemCatalog) => {
    send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: `${waiterInstructions(catalog)}\n\n${waiterContext(buildSnapshot(catalog))}`,
        audio: {
          output: { voice: activeWaiterPersona().voiceId },
          input: {
            transcription: { model: 'gpt-4o-mini-transcribe', language: 'pt' },
            // O supressor de ruído da própria Realtime. `near_field` é o perfil
            // de quem fala A CENTÍMETROS do microfone — que é exatamente a
            // postura de alguém em pé na frente de um totem. `far_field` é para
            // microfone de sala de reunião e, num salão, deixa entrar a mesa ao
            // lado como se fosse o cliente.
            noise_reduction: { type: 'near_field' },
            // O servidor escuta e decide quando a frase acabou. `eagerness:
            // 'low'` dá mais corda: num salão barulhento, com alguém lendo o
            // cardápio enquanto fala, cortar cedo é pior do que esperar meio
            // segundo a mais.
            turn_detection: {
              type: 'semantic_vad',
              eagerness: 'low',
              create_response: true,
              // NÃO se deixa interromper por barulho. Com `true`, qualquer
              // ruído que o VAD leia como fala cancela a resposta no meio — e
              // numa praça de alimentação isso é uma bandeja caindo, a mesa ao
              // lado, o liquidificador. O cliente via o garçom emudecer sem
              // motivo e concluía que travou.
              //
              // O custo é real e é menor: para cortar o garçom, o cliente toca
              // no orbe. As respostas são de uma ou duas frases de propósito,
              // então a espera é de segundos, não de um monólogo.
              interrupt_response: false,
            },
          },
        },
        tools: toolSchemas(),
        tool_choice: 'auto',
      },
    })
  }

  const connect = async (catalog: TotemCatalog): Promise<void> => {
    if (pc) return
    catalogRef = catalog
    store().setPhase('thinking')

    const { key, model } = await mintToken(waiterInstructions(catalog))

    mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Mono: o painel tem um microfone só, e mandar dois canais idênticos
        // dobra a banda sem dobrar informação.
        channelCount: 1,
        // Isolamento de voz do navegador (Chrome 130+, Safari 17.2+). Ele
        // separa voz de ruído ANTES de a captura sair da máquina, então soma
        // com o supressor do servidor em vez de competir. Um navegador que não
        // conhece a chave simplesmente a ignora — por isso não está atrás de
        // teste de suporte.
        voiceIsolation: true,
      } as MediaTrackConstraints,
    })
    // Entra mudo. A conexão sobe no primeiro toque no microfone, e entre um
    // toque e outro nada trafega.
    mic.getAudioTracks().forEach((track) => (track.enabled = false))

    pc = new RTCPeerConnection()
    pc.addTrack(mic.getAudioTracks()[0], mic)

    audio = document.createElement('audio')
    audio.autoplay = true
    pc.ontrack = (event) => {
      if (audio) audio.srcObject = event.streams[0]
      // Enquanto o garçom fala, o globo passa a desenhar a voz DELE.
      meterRemote(event.streams[0])
    }

    channel = pc.createDataChannel('oai-events')
    channel.onmessage = (event) => {
      try {
        handleEvent(JSON.parse(event.data))
      } catch {
        // Um evento que não é JSON é da própria OpenAI e não nosso para tratar.
      }
    }
    channel.onopen = () => {
      configure(catalog)
      store().setPhase('idle')
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const res = await fetch(`${CALLS_URL}?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/sdp' },
      body: offer.sdp ?? '',
    })
    if (!res.ok) throw new Error(`a chamada de voz foi recusada (${res.status})`)

    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
    startLevelPump()
  }

  const ensure = (catalog: TotemCatalog): Promise<void> => {
    connecting ??= connect(catalog).catch((cause) => {
      // Uma falha de conexão zera a tentativa: o próximo toque tenta de novo em
      // vez de ficar preso numa promise rejeitada para sempre.
      connecting = null
      store().setError(cause instanceof Error ? cause.message : String(cause))
      throw cause
    })
    return connecting
  }

  return {
    id: 'voice',

    async startListening(catalog) {
      try {
        await ensure(catalog)
      } catch {
        return
      }
      if (!mic) return
      catalogRef = catalog
      // O retrato da tela muda a cada item adicionado; sem reenviar, o garçom
      // responde sobre um carrinho que não existe mais.
      configure(catalog)
      meterMicrophone(mic)
      mic.getAudioTracks().forEach((track) => (track.enabled = true))
      store().setLive('')
      store().setPhase('listening')
    },

    async stopListening() {
      if (!mic) return
      // Fechar o microfone é só isso: fechar o microfone. Quem decide que a
      // frase acabou é o VAD do servidor, e ele já decidiu enquanto a pessoa
      // falava — mandar `commit` aqui criaria um turno vazio por cima do que
      // ele acabou de fechar.
      mic.getAudioTracks().forEach((track) => (track.enabled = false))
      detach()
      store().setLevel(0)
      store().setPhase('idle')
    },

    async send(text, catalog) {
      try {
        await ensure(catalog)
      } catch {
        return
      }
      catalogRef = catalog
      configure(catalog)
      store().pushTurn({ id: `c-${Date.now()}`, from: 'customer', text })
      send({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
      })
      send({ type: 'response.create' })
      store().setPhase('thinking')
    },

    dispose() {
      if (levelTimer) clearInterval(levelTimer)
      levelTimer = null
      detach()
      mic?.getTracks().forEach((track) => track.stop())
      channel?.close()
      pc?.close()
      audio?.remove()
      mic = null
      channel = null
      pc = null
      audio = null
      connecting = null
      speakingTurnId = null
    },
  }
}
