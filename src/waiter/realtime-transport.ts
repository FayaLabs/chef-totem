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
// 1. THE SERVER DECIDES WHEN THE SENTENCE ENDED, not the finger. It used to be
//    push-to-talk: `turn_detection: null` and a manual `commit` on button
//    release. That guarded against an open mic and charged dearly for it —
//    people pause mid-order to think, and every pause became "did it send
//    already?".
//
//    Which VAD does the deciding changed on 2026-09-09, after A/B-ing both in
//    the realtime console rig. It was `semantic_vad` with `eagerness: 'low'`,
//    which judges whether the THOUGHT is finished and so never cuts on a pause.
//    Better endpointing — but it exposes no sensitivity knob, and the totem's
//    real enemy is not silence, it is other people's speech. Noise reduction
//    cannot remove that: background conversation IS speech and survives the
//    filter.
//
//    `server_vad` is the cruder detector — it only knows loud versus quiet —
//    and that is exactly the axis that separates the customer from the room.
//    The customer is centimetres from the mic; the hall is metres away, and
//    the level gap is large. `threshold` turns that gap into a gate, which
//    `semantic_vad` cannot do at any setting. The cost is endpointing: silence
//    alone calls the turn, so `silence_duration_ms` has to carry the pauses
//    that semantics used to handle.
//
//    The mic is still not open by default. It opens on a tap of the orb,
//    closes on the next tap, and the whole session dies at the end of the
//    visit — what the next table never consented to was being recorded with
//    nobody asking, not the conversation of whoever pressed the button.
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

/**
 * How long the response lock waits with NO word from the server before it
 * assumes the response was lost.
 *
 * This is an idle timeout, not a total duration. It used to be the latter, and
 * that was wrong: a response is not a single event, it is a stream of them
 * (transcript deltas, item added, audio buffer started), and a legitimate one
 * can outlive any fixed budget — a four-round tool chain narrating as it goes
 * takes as long as it takes. When the timer fired under a live response it
 * cleared the lock, the next screen announcement passed the gate, and the
 * server answered with "already has an active response in progress".
 *
 * Measuring silence instead means the timer only fires when the server has
 * genuinely stopped talking to us, which is the only case it was ever meant to
 * catch. That makes 20s generous rather than tight — the deltas of a live
 * response arrive milliseconds apart.
 */
const RESPONSE_TIMEOUT_MS = 20_000

/**
 * Teto de rodadas de ferramenta encadeadas numa resposta só.
 *
 * Um pedido honesto usa três ou quatro (apontar, abrir, marcar, adicionar).
 * Passar de oito é o modelo insistindo numa ferramenta que responde sempre a
 * mesma coisa — e insistir para sempre é o que o cliente vê como o garçom
 * enlouquecendo.
 */
const MAX_TOOL_ROUNDS = 8

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

/**
 * Dev-only escape hatch: mint the ephemeral secret from a plain local endpoint
 * instead of the edge function.
 *
 * The production path needs a deployed `totem-voice-token` AND a device session
 * to authenticate against it, which is a lot of infrastructure to stand up just
 * to hear whether a VAD threshold is right. The realtime console rig already
 * exposes a `/token` that mints valid secrets, so in dev we can point at it.
 *
 * Guarded by `import.meta.env.DEV` as well as the variable: a production build
 * ignores this branch even if the variable leaks into the build environment,
 * because that endpoint has no auth in front of it.
 */
async function mintTokenLocally(url: string): Promise<{ key: string; model: string }> {
  const res = await fetch(url)
  const body = (await res.json().catch(() => ({}))) as TokenResponse
  if (!res.ok || !body.value) throw new Error(`voz indisponível (${res.status})`)
  // The session config this returns is the rig's, not ours — `configure()`
  // overwrites voice, noise_reduction and turn_detection right after connect.
  return { key: body.value, model: body.model ?? DEFAULT_MODEL }
}

/**
 * Does this event prove the response the server is running is still alive?
 *
 * Only response-lifecycle traffic counts. Input-side events (`speech_started`
 * and friends) are deliberately excluded: a noisy room emits those constantly,
 * and letting room noise re-arm the watchdog would keep a dead lock alive
 * forever — the exact failure the watchdog exists to break.
 */
export function isResponseAliveEvent(type: string): boolean {
  return type.startsWith('response.') || type.startsWith('output_audio_buffer.')
}

/**
 * Is this server error the benign "you asked twice" race?
 *
 * "Conversation already has an active response in progress: resp_X" is the
 * server correcting our bookkeeping, not a failure: a response IS running and
 * our `response.create` was redundant. Everything else is a real error.
 *
 * Exported for the regression test — the handler that consumes it lives in a
 * closure behind a WebRTC connection.
 */
export function isResponseBusyError(raw: string): boolean {
  return /active response in progress/i.test(raw)
}

/** The `resp_…` id named in a server error, when there is one. */
export function responseIdFrom(raw: string): string | null {
  return /resp_[A-Za-z0-9]+/.exec(raw)?.[0] ?? null
}

async function mintToken(instructions: string): Promise<{ key: string; model: string }> {
  const localUrl = import.meta.env.VITE_TOTEM_VOICE_TOKEN_URL
  if (import.meta.env.DEV && localUrl) return mintTokenLocally(localUrl)

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
  /**
   * Há uma resposta em andamento no servidor?
   *
   * Com `create_response: true` quem cria a resposta quando o VAD fecha o turno
   * é o SERVIDOR. Mandar `response.create` por cima disso devolve
   * "Conversation already has an active response in progress" — e o erro ia
   * parar na faixa, em vermelho, na cara do cliente.
   */
  let responseActive = false
  /**
   * The id of the response the SERVER says is running, when we know it.
   *
   * `responseActive` is a guess — it is set optimistically on
   * `speech_stopped`, before any server event confirms a response exists. This
   * is the authoritative half: `response.created` fills it, `response.done`
   * clears it, and a stale `done` for an older response can no longer unlock a
   * newer one.
   */
  let activeResponseId: string | null = null
  /** Um `response.create` que chegou cedo demais e espera a vez. */
  let responsePending = false
  /**
   * Solta a trava se o `response.done` nunca vier.
   *
   * `responseActive` era otimista: se o servidor engolisse a resposta, a flag
   * ficava presa em `true` e TODO pedido seguinte entrava na fila para nunca
   * sair — o painel virava um garçom que ouve e não responde, sem um erro
   * sequer na tela.
   */
  let responseGuard: ReturnType<typeof setTimeout> | null = null
  /**
   * Quantas rodadas de ferramenta esta conversa já encadeou sem o cliente falar.
   *
   * Cada `function_call_output` pede outra resposta, e outra resposta pode
   * chamar outra ferramenta. Quando uma ferramenta responde a mesma coisa toda
   * vez ("nenhum prato aberto"), o modelo tenta de novo — e a corrente não tem
   * fim sozinha. Isso é o garçom "enlouquecendo": ele fala, chama, fala, chama.
   */
  let toolRounds = 0
  /** O último anúncio pendente. UM, não uma fila — ver `announce`. */
  let pendingAnnounce: string | null = null
  let lastAnnounce = ''

  const store = () => useWaiter.getState()

  const send = (payload: unknown) => {
    if (channel?.readyState === 'open') channel.send(JSON.stringify(payload))
  }

  /**
   * Pede uma resposta — ou espera a vez.
   *
   * É o único lugar de onde sai um `response.create`. Antes havia três, e dois
   * deles disparavam enquanto o servidor já tinha criado a sua.
   */
  const requestResponse = () => {
    if (responseActive) {
      responsePending = true
      return
    }
    responseActive = true
    if (responseGuard) clearTimeout(responseGuard)
    responseGuard = setTimeout(() => {
      responseActive = false
      if (responsePending) {
        responsePending = false
        requestResponse()
      }
    }, RESPONSE_TIMEOUT_MS)
    send({ type: 'response.create' })
  }

  const settleResponse = () => {
    responseActive = false
    activeResponseId = null
    if (responseGuard) clearTimeout(responseGuard)
    responseGuard = null
  }

  /** Push the watchdog out — the server just proved the response is alive. */
  const touchResponse = () => {
    if (!responseActive) return
    if (responseGuard) clearTimeout(responseGuard)
    responseGuard = setTimeout(settleResponse, RESPONSE_TIMEOUT_MS)
  }

  /**
   * Re-lock: the server has told us a response is running that we did not think
   * was. Arms the watchdog so a lost `response.done` cannot strand the lock.
   */
  const holdResponse = (id: string | null) => {
    responseActive = true
    if (id) activeResponseId = id
    if (responseGuard) clearTimeout(responseGuard)
    responseGuard = setTimeout(settleResponse, RESPONSE_TIMEOUT_MS)
  }

  /** Manda o anúncio que ficou esperando, se ainda houver um. */
  const flushAnnounce = () => {
    if (!pendingAnnounce || responseActive) return
    const text = pendingAnnounce
    pendingAnnounce = null
    send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] },
    })
    requestResponse()
  }

  const startLevelPump = () => {
    if (levelTimer) return
    levelTimer = setInterval(() => store().setLevel(currentLevel()), LEVEL_MS)
  }

  const handleEvent = (event: Record<string, unknown>) => {
    const type = String(event.type ?? '')

    // The server is still working, so push the watchdog out. Without this the
    // lock could expire mid-response and let a second `response.create` through.
    if (responseActive && isResponseAliveEvent(type)) touchResponse()

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

      toolRounds += 1
      if (toolRounds > MAX_TOOL_ROUNDS) {
        // Corta a corrente e devolve a vez ao cliente. Melhor um garçom que
        // para de falar do que um que fala sozinho até alguém desligar o painel.
        console.warn('[waiter] corrente de ferramentas cortada em', toolRounds)
        toolRounds = 0
        store().setPhase('idle')
        return
      }
      // Depois de mexer na tela, o estado mudou; o modelo precisa do novo
      // retrato antes de decidir a próxima frase. Se a resposta que fez a
      // chamada ainda está aberta, esta espera o `response.done` dela.
      requestResponse()
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
      // O servidor VAI criar a resposta (create_response: true), e leva alguns
      // quadros até o `response.created` chegar. Sem marcar a trava aqui, um
      // anúncio da tela nessa janela manda um `response.create` por cima da que
      // o servidor está criando — e volta "already has an active response".
      responseActive = true
      if (responseGuard) clearTimeout(responseGuard)
      responseGuard = setTimeout(settleResponse, RESPONSE_TIMEOUT_MS)
      return store().setPhase('thinking')
    }
    if (type === 'response.created') {
      responseActive = true
      activeResponseId =
        ((event.response as { id?: string } | undefined)?.id ?? null) || null
      return store().setPhase('thinking')
    }
    if (type === 'output_audio_buffer.started') return store().setPhase('speaking')
    if (type === 'response.done') {
      const doneId =
        ((event.response as { id?: string } | undefined)?.id ?? null) || null
      // A `done` for a response we already replaced must not unlock the current
      // one — that is how a stale event opens the gate under a live response.
      if (activeResponseId && doneId && doneId !== activeResponseId) return
      settleResponse()
      // A corrente de ferramentas morre com a resposta que a começou.
      toolRounds = 0
      if (responsePending) {
        responsePending = false
        requestResponse()
        return
      }
      flushAnnounce()
    }
    if (type === 'response.done' || type === 'output_audio_buffer.stopped') {
      // Terminou de falar e o microfone continua aberto: volta a ESCUTAR, não a
      // repouso. Num diálogo, o silêncio depois da resposta é a vez do cliente.
      const stillOpen = mic?.getAudioTracks().some((track) => track.enabled) ?? false
      store().setPhase(stillOpen ? 'listening' : 'idle')
      return
    }
    if (type === 'error') {
      const raw = (event.error as { message?: string } | undefined)?.message ?? ''

      // "Conversation already has an active response in progress: resp_X" is
      // not a failure — it is the server correcting our bookkeeping. It means a
      // response IS running and our `response.create` was redundant.
      //
      // Treating it like any other error was the bug behind the waiter going
      // haywire. `settleResponse()` set `responseActive = false` — the exact
      // opposite of what the server just said — so the next screen announcement
      // sailed through the gate and sent ANOTHER `response.create`, which
      // errored the same way, and so on for as long as the screen kept moving.
      // `responsePending = false` then threw away the queued announcement, so
      // the waiter fell silent on a turn it owed an answer for, and the
      // customer was told to tap the orb over a race that never touched the
      // microphone.
      //
      // The right move is the inverse: re-lock, keep the queued work, say
      // nothing to the customer. The pending item goes out on `response.done`.
      if (isResponseBusyError(raw)) {
        console.debug('[waiter] response.create ignored, one already running')
        holdResponse(responseIdFrom(raw))
        return
      }

      // O texto cru é do PROTOCOLO, e o cliente não fala protocolo. Um erro de
      // verdade em vermelho na faixa não diz nada a quem quer almoçar.
      console.error('[waiter]', raw)
      settleResponse()
      responsePending = false
      store().setError('Não consegui te ouvir agora. Toque no orbe e tente de novo.')
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
            // Energy gate over smart endpointing — see decision 1 in the
            // header. Values validated by ear in the realtime console rig
            // before landing here.
            turn_detection: {
              type: 'server_vad',
              // The whole point. The 0.5 default admits far-field speech, so
              // the next table opens a turn. 0.75 needs someone close and
              // deliberate. This is the knob to walk DOWN (0.70, then 0.65) if
              // quiet customers report it is not listening — the failure mode
              // of too high is silence, and it looks like a broken totem.
              threshold: 0.75,
              // Left at the default deliberately. A high threshold trips
              // slightly late, and this padding is what keeps the first
              // syllable from being clipped. Lowering it to "let in less
              // noise" eats word onsets instead.
              prefix_padding_ms: 300,
              // 500 (the default) commits half a sentence in a loud room,
              // because the gaps people leave get filled by other voices.
              // 700 rides over the pause of someone reading the menu aloud,
              // and buys it for ~200 ms of extra latency. This is what pays
              // for dropping semantic endpointing.
              silence_duration_ms: 700,
              create_response: true,
              // NOT interruptible by noise. With `true`, any sound the VAD
              // reads as speech cancels the reply mid-sentence — in a food
              // court that is a dropped tray, the next table, the blender.
              // Customers saw the waiter go mute for no reason and concluded
              // it had frozen.
              //
              // The cost is real and smaller: to cut the waiter off, the
              // customer taps the orb. Replies are one or two sentences by
              // design, so the wait is seconds, not a monologue.
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
    // `connecting`, não `thinking`: minting the token, asking for the microphone
    // and completing the WebRTC handshake take seconds on a panel's network, and
    // in those seconds nothing has been said yet. The dock reads this phase to
    // show that something IS happening — a silent strip is read as a dead panel,
    // and the customer joins the till queue.
    store().setPhase('connecting')

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
      // E a fase VOLTA. Sem isto o painel ficava em `connecting` para sempre —
      // pontinhos pulsando ao lado de uma frase de erro, e o orbe oferecendo
      // "parar" uma sessão que nunca existiu. Parado, o próximo toque tenta de
      // novo, que é o que a frase vermelha está pedindo.
      store().setPhase('idle')
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

    async greet(instruction, catalog) {
      try {
        await ensure(catalog)
      } catch {
        // Voz indisponível é um totem que continua vendendo no dedo. O erro já
        // foi para a faixa em `ensure`; aqui a gente só não fala.
        return
      }
      if (!mic) return
      catalogRef = catalog
      configure(catalog)
      meterMicrophone(mic)
      mic.getAudioTracks().forEach((track) => (track.enabled = true))
      store().setLive('')
      // Conta como anúncio para o dedupe: se a tela repetir o cumprimento por
      // um remonte de componente, ele não é dito duas vezes.
      lastAnnounce = instruction
      send({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: instruction }] },
      })
      requestResponse()
      store().setPhase('thinking')
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

    async announce(instruction, catalog) {
      // Só narra se a sessão JÁ existe. Abrir uma conexão de voz porque o
      // cliente tocou em "cartão" seria ligar o microfone sem ninguém pedir.
      if (!pc) return
      // O mesmo aviso duas vezes não é aviso, é eco. A tela emite
      // `payment_processing` a cada mudança de status, e o cliente ouvia "só um
      // instante" três vezes seguidas.
      if (instruction === lastAnnounce) return
      lastAnnounce = instruction
      catalogRef = catalog

      // UM pendente, não uma fila. Escolher cartão dispara três eventos em
      // sequência; enfileirados, viram três falas encadeadas sobre uma coisa
      // que já passou. O último aviso é o único que ainda descreve a tela.
      if (responseActive) {
        pendingAnnounce = instruction
        return
      }
      send({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: instruction }] },
      })
      requestResponse()
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
      requestResponse()
      store().setPhase('thinking')
    },

    dispose() {
      if (levelTimer) clearInterval(levelTimer)
      levelTimer = null
      if (responseGuard) clearTimeout(responseGuard)
      responseGuard = null
      detach()
      // Cala a resposta em curso ANTES de derrubar o transporte. O canal morre
      // logo abaixo de qualquer jeito, mas um cancelamento explícito é o que
      // faz a OpenAI parar de gerar em vez de continuar falando para uma
      // conexão que já não existe.
      if (channel?.readyState === 'open') {
        try {
          channel.send(JSON.stringify({ type: 'response.cancel' }))
        } catch {
          // Um canal que fechou entre o teste e o envio já está calado.
        }
      }
      mic?.getTracks().forEach((track) => track.stop())
      channel?.close()
      pc?.close()
      // `remove()` não bastava: este elemento nunca esteve no documento, e um
      // <audio> destacado com `srcObject` continua tocando o que já estava no
      // buffer. Pausar e soltar a stream é o que realmente faz silêncio — que é
      // a única coisa que o botão de parar promete.
      if (audio) {
        audio.pause()
        audio.srcObject = null
      }
      audio?.remove()
      mic = null
      channel = null
      pc = null
      audio = null
      connecting = null
      speakingTurnId = null
      responseActive = false
      responsePending = false
      pendingAnnounce = null
      lastAnnounce = ''
      toolRounds = 0
    },
  }
}
