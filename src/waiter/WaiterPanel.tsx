import { useState } from 'react'
import { ArrowUp, Mic, Square } from 'lucide-react'
import { Sheet } from '@/design'
import { VoiceOrb } from '@/waiter/VoiceOrb'
import { useWaiter } from '@/waiter/useWaiter'
import { activeWaiterPersona } from '@/waiter/persona'

// The whole conversation, when the customer wants to see it — plus a keyboard,
// because a noisy room, a strong accent or a sore throat should never be the
// thing that stops someone ordering.
export function WaiterPanel({ onSend }: { onSend: (text: string) => void }) {
  const expanded = useWaiter((s) => s.expanded)
  const setExpanded = useWaiter((s) => s.setExpanded)
  const turns = useWaiter((s) => s.turns)
  const live = useWaiter((s) => s.liveTranscript)
  const phase = useWaiter((s) => s.phase)
  const controls = useWaiter((s) => s.controls)
  const [draft, setDraft] = useState('')
  const listening = phase === 'listening'
  const typed = draft.trim().length > 0

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onSend(text)
  }

  return (
    <Sheet open={expanded} onClose={() => setExpanded(false)} data-testid="waiter-panel">
      {/* O MESMO orbe da barra, não um segundo desenho. Duas representações do
          mesmo assistente na mesma tela é o cliente perguntando qual das duas
          está ouvindo — e aqui elas apareciam juntas: o círculo escuro no
          cabeçalho e o orbe colorido logo atrás do scrim. */}
      <div className="flex items-center gap-[3cqw] pb-[3cqw]">
        <VoiceOrb size="11cqw" />
        <span className="min-w-0 flex-1">
          <span
            className="block font-display uppercase leading-none tracking-tight"
            style={{ fontSize: 'var(--step-title)' }}
          >
            {activeWaiterPersona().name}
          </span>
          {/* mt: a display tem leading-none e a cedilha de "Garçom" desce em
              cima da linha de estado sem esta folga. */}
          <span
            className="mt-[1.2cqw] block uppercase tracking-[0.28em] text-muted"
            style={{ fontSize: 'var(--step-label)' }}
          >
            {phase === 'listening'
              ? 'ouvindo'
              : phase === 'thinking'
                ? 'só um instante'
                : phase === 'speaking'
                  ? 'falando'
                  : 'pronto quando você estiver'}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-[2.5cqw]" data-testid="waiter-turns">
        {turns.length === 0 && !live ? (
          <p className="py-[4cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>
            Peça como pediria a {activeWaiterPersona().name}, com as suas palavras.
          </p>
        ) : null}

        {turns.map((turn) => (
          <div
            key={turn.id}
            data-testid={`turn-${turn.from}`}
            className={[
              'max-w-[80%] rounded-totem px-[3cqw] py-[2.5cqw]',
              turn.from === 'customer' ? 'self-end bg-ink text-white' : 'self-start bg-page text-ink',
            ].join(' ')}
            style={{ fontSize: 'var(--step-body)' }}
          >
            {turn.text}
            {/* What it actually did, in plain words. A customer who can see
                "abriu a Calabresa · marcou Média" trusts the next thing it says. */}
            {turn.did?.length ? (
              <span
                className="mt-[1cqw] block uppercase tracking-[0.2em] text-muted"
                style={{ fontSize: 'var(--step-label)' }}
              >
                {turn.did.join(' · ')}
              </span>
            ) : null}
          </div>
        ))}

        {live ? (
          <div
            data-testid="turn-live"
            className="max-w-[80%] self-end rounded-totem bg-ink/70 px-[3cqw] py-[2.5cqw] text-white"
            style={{ fontSize: 'var(--step-body)' }}
          >
            {live}
          </div>
        ) : null}
      </div>

      {/* Campo e botão numa peça só, como toda caixa de chat que a pessoa já
          usou. Separados por um gutter, o botão lia como uma terceira ação da
          tela em vez de "enviar isto"; e o campo com borda de 2px era mais
          pesado do que o texto que ele ia receber. */}
      <div
        className={[
          'mt-[4cqw] flex items-center gap-[2cqw] rounded-[3cqw] bg-white/70 p-[1.4cqw] backdrop-blur-xl',
          'shadow-[inset_0_0.14cqw_0_rgba(255,255,255,0.9),0_0.25cqw_0.8cqw_rgba(11,11,12,0.10)]',
          'focus-within:bg-white',
        ].join(' ')}
      >
        <input
          data-testid="waiter-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send()
          }}
          placeholder={listening ? 'Ouvindo…' : 'Fale ou escreva aqui'}
          disabled={phase === 'thinking'}
          className="min-h-[var(--tap)] min-w-0 flex-1 bg-transparent pl-[3cqw] text-ink outline-none placeholder:text-muted disabled:opacity-50"
          style={{ fontSize: 'var(--step-body)' }}
        />

        {/* UM controle à direita, não dois. Ele é o microfone enquanto o campo
            está vazio e vira o enviar assim que há texto — a mesma peça
            mudando de função conforme o que a pessoa fez, que é como toda caixa
            de chat que ela já usou se comporta.

            Dois botões permanentes (falar à esquerda, enviar à direita) davam
            ao cliente uma escolha que ele não tem: com o campo vazio, enviar
            não faz nada; com texto escrito, falar joga o texto fora. */}
        {typed ? (
          <button
            type="button"
            aria-label="Enviar"
            data-testid="waiter-send"
            onClick={send}
            disabled={phase === 'thinking'}
            className="press grid size-[var(--tap)] shrink-0 place-items-center rounded-full bg-ink text-white transition-colors disabled:bg-black/[0.07] disabled:text-ink/35"
          >
            <ArrowUp strokeWidth={3} className="size-[3cqw]" />
          </button>
        ) : controls ? (
          <button
            type="button"
            aria-label={listening ? 'Parar de falar' : 'Falar'}
            aria-pressed={listening}
            data-testid="panel-mic"
            disabled={phase === 'thinking' || phase === 'speaking'}
            onClick={listening ? controls.stop : controls.start}
            className={[
              'press grid size-[var(--tap)] shrink-0 place-items-center rounded-full transition-colors',
              listening ? 'bg-action text-white' : 'bg-black/[0.07] text-ink/70',
              'disabled:opacity-40',
            ].join(' ')}
          >
            {listening ? (
              <Square strokeWidth={3} className="size-[2.4cqw]" fill="currentColor" />
            ) : (
              <Mic strokeWidth={2.5} className="size-[3cqw]" />
            )}
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
