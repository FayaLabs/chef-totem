import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Square } from 'lucide-react'
import { Sheet } from '@/design'
import { VoiceOrb } from '@/waiter/VoiceOrb'
import { talkAction, useWaiter } from '@/waiter/useWaiter'
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
  // O mesmo controle da faixa, com o mesmo sentido: falar, calar o microfone,
  // ou derrubar a sessão. Ver `talkAction` e TalkButton.
  const panelAction = talkAction(phase)
  const thread = useRef<HTMLDivElement>(null)

  // Rola para o fim a cada turno novo. Sem isto a conversa cresce para baixo,
  // fora da vista, e o cliente lê a resposta do garçom sobre uma pergunta que
  // já saiu da tela — que é o mesmo que não ter histórico nenhum.
  useEffect(() => {
    const el = thread.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: turns.length <= 1 ? 'auto' : 'smooth' })
  }, [turns, live])
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
            className="block type-display leading-none tracking-tight"
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
              : phase === 'connecting'
                ? 'conectando…'
                : phase === 'thinking'
                  ? 'só um instante'
                  : phase === 'speaking'
                    ? 'falando'
                    : 'pronto quando você estiver'}
          </span>
        </span>
      </div>

      {/* A conversa inteira, rolável. Ela era uma lista que crescia dentro do
          corpo do sheet; agora tem altura própria e âncora no fim, então a
          última coisa dita está sempre visível e o resto fica um dedo acima. */}
      <div
        ref={thread}
        className="flex max-h-[46cqw] min-h-[24cqw] flex-col gap-[2.5cqw] overflow-y-auto"
        data-testid="waiter-turns"
      >
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
              // A fala do garçom é uma pane de vidro; a do cliente é tinta
              // sólida. Os dois lados de um chat precisam de materiais
              // diferentes e não só de cores diferentes — num painel a um metro
              // de distância, dois retângulos do mesmo material com dois tons
              // parecidos lêem como uma lista, não como uma conversa.
              turn.from === 'customer' ? 'sheen self-end bg-ink text-white' : 'glass self-start text-ink',
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
          'glass mt-[4cqw] flex items-center gap-[2cqw] rounded-[3cqw] p-[1.4cqw]',
          'focus-within:brightness-[1.03]',
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
          disabled={phase === 'thinking' || phase === 'connecting'}
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
            disabled={phase === 'thinking' || phase === 'connecting'}
            className="press grid size-[var(--tap)] shrink-0 place-items-center rounded-full bg-ink text-white transition-colors disabled:bg-black/[0.07] disabled:text-ink/35"
          >
            <ArrowUp strokeWidth={3} className="size-[3cqw]" />
          </button>
        ) : controls ? (
          <button
            type="button"
            aria-label={panelAction === 'stop-listening' ? 'Parar de falar' : panelAction === 'end' ? 'Parar o assistente' : 'Falar'}
            aria-pressed={listening}
            data-testid="panel-mic"
            data-action={panelAction ?? 'none'}
            onClick={
              panelAction === 'stop-listening'
                ? controls.stop
                : panelAction === 'end'
                  ? controls.end
                  : controls.start
            }
            className={[
              'press grid size-[var(--tap)] shrink-0 place-items-center rounded-full transition-colors',
              listening ? 'bg-action text-on-action' : 'bg-black/[0.07] text-ink/70',
              'disabled:opacity-40',
            ].join(' ')}
          >
            {/* Quadrado sempre que o toque PARA alguma coisa — o microfone
                aberto ou a sessão inteira. Microfone só quando ele começa. */}
            {panelAction === 'start' ? (
              <Mic strokeWidth={2.5} className="size-[3cqw]" />
            ) : (
              <Square strokeWidth={3} className="size-[2.4cqw]" fill="currentColor" />
            )}
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
