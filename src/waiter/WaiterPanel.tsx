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
        {/* Falar de dentro do painel. Ele foi aberto para VER a conversa, e
            fechá-lo só para alcançar o microfone da barra é um passo que só
            existe por causa de onde nós pusemos os botões. */}
        {controls ? (
          <button
            type="button"
            aria-label={listening ? 'Parar de falar' : 'Falar'}
            aria-pressed={listening}
            data-testid="panel-mic"
            disabled={phase === 'thinking' || phase === 'speaking'}
            onClick={listening ? controls.stop : controls.start}
            className={[
              'press grid size-[var(--tap)] shrink-0 place-items-center rounded-full transition-colors',
              listening ? 'bg-action text-white' : 'bg-black/[0.06] text-ink/70',
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

        <input
          data-testid="waiter-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send()
          }}
          placeholder={listening ? 'Ouvindo…' : 'Fale ou escreva aqui'}
          disabled={phase === 'thinking'}
          className="min-h-[var(--tap)] min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted disabled:opacity-50"
          style={{ fontSize: 'var(--step-body)' }}
        />
        {/* Só acende com algo escrito. Um botão de enviar sempre preto convida
            o toque que não manda nada, e o cliente conclui que travou. */}
        <button
          type="button"
          aria-label="Enviar"
          data-testid="waiter-send"
          onClick={send}
          disabled={phase === 'thinking' || draft.trim().length === 0}
          className={[
            'press grid size-[var(--tap)] shrink-0 place-items-center rounded-full transition-colors',
            draft.trim() ? 'bg-ink text-white' : 'bg-black/[0.07] text-ink/35',
            'disabled:cursor-default',
          ].join(' ')}
        >
          <ArrowUp strokeWidth={3} className="size-[3cqw]" />
        </button>
      </div>
    </Sheet>
  )
}
