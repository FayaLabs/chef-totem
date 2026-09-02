import { useState } from 'react'
import { Send } from 'lucide-react'
import { Sheet, TotemButton } from '@/design'
import { WaiterOrb } from '@/waiter/WaiterOrb'
import { useWaiter } from '@/waiter/useWaiter'

// The whole conversation, when the customer wants to see it — plus a keyboard,
// because a noisy room, a strong accent or a sore throat should never be the
// thing that stops someone ordering.
export function WaiterPanel({ onSend }: { onSend: (text: string) => void }) {
  const expanded = useWaiter((s) => s.expanded)
  const setExpanded = useWaiter((s) => s.setExpanded)
  const turns = useWaiter((s) => s.turns)
  const live = useWaiter((s) => s.liveTranscript)
  const phase = useWaiter((s) => s.phase)
  const [draft, setDraft] = useState('')

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onSend(text)
  }

  return (
    <Sheet open={expanded} onClose={() => setExpanded(false)} data-testid="waiter-panel">
      <div className="flex items-center gap-[3cqw] pb-[3cqw]">
        <WaiterOrb size="10cqw" />
        <span className="font-display uppercase tracking-tight" style={{ fontSize: 'var(--step-title)' }}>
          Garçom
        </span>
      </div>

      <div className="flex flex-col gap-[2.5cqw]" data-testid="waiter-turns">
        {turns.length === 0 && !live ? (
          <p className="py-[4cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>
            Peça como pediria a um garçom: “uma costela grande com bacon, sem cebola”.
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

      <div className="mt-[4cqw] flex items-center gap-[2cqw]">
        <input
          data-testid="waiter-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send()
          }}
          placeholder="Ou escreva aqui"
          disabled={phase === 'thinking'}
          className="min-h-[var(--tap)] flex-1 rounded-totem border-2 border-edge bg-white px-[3cqw] text-ink disabled:bg-disabled-bg"
          style={{ fontSize: 'var(--step-body)' }}
        />
        <TotemButton tone="ink" data-testid="waiter-send" onClick={send} disabled={phase === 'thinking'}>
          <Send strokeWidth={3} className="size-[2.4cqw]" />
        </TotemButton>
      </div>
    </Sheet>
  )
}
