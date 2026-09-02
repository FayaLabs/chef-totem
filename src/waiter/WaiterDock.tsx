import { Mic, Square, ChevronUp } from 'lucide-react'
import { WaiterOrb } from '@/waiter/WaiterOrb'
import { lastWaiterLine, useWaiter } from '@/waiter/useWaiter'

// ---------------------------------------------------------------------------
// The waiter, present.
//
// Not a floating button that opens a panel over the menu. A kiosk panel that
// scrolls will always end up with a floating control on top of something (see
// DESIGN.md — this app already learned that twice), and covering the food to
// talk about the food is the wrong trade.
//
// So the waiter RESERVES a strip directly above the bottom bar. It is always
// there, it never moves, and it never hides a dish. The customer's eye finds it
// once and knows where it lives for the rest of the visit.
//
// What the strip carries, in priority order:
//   1. the orb        — is it listening, thinking or talking
//   2. one line       — the live transcript, or the last thing the waiter said
//   3. the mic        — the biggest target on the strip, at the thumb
//
// Everything else (full conversation, typing) is one tap away in the sheet.
// A dock that tried to be a chat window would eat the menu.
// ---------------------------------------------------------------------------

export const WAITER_DOCK_HEIGHT = '17cqw'

export interface WaiterDockProps {
  /** Push-to-talk down / up. The mic is never open without a finger. */
  onTalkStart: () => void
  onTalkStop: () => void
  /** Tappable openers shown while idle — nobody reads instructions on a kiosk. */
  suggestions?: string[]
  onSuggestion?: (text: string) => void
}

export function WaiterDock({ onTalkStart, onTalkStop, suggestions = [], onSuggestion }: WaiterDockProps) {
  const phase = useWaiter((s) => s.phase)
  const live = useWaiter((s) => s.liveTranscript)
  const turns = useWaiter((s) => s.turns)
  const error = useWaiter((s) => s.error)
  const setExpanded = useWaiter((s) => s.setExpanded)

  if (phase === 'off') return null

  const listening = phase === 'listening'
  const busy = phase === 'thinking' || phase === 'speaking'

  // One line, chosen by what matters most at this instant: what the customer is
  // saying beats what the waiter last said beats an invitation.
  const line =
    error ??
    (live || null) ??
    lastWaiterLine(turns) ??
    'Peça como pediria a um garçom.'

  return (
    <div
      data-testid="waiter-dock"
      data-phase={phase}
      className="absolute inset-x-0 z-30 flex items-center gap-[3cqw] border-t-2 border-edge bg-surface px-[3cqw] shadow-[0_-0.6cqw_2cqw_rgba(11,11,12,0.08)] motion-safe:animate-[waiter-dock-in_320ms_cubic-bezier(0.16,1,0.3,1)]"
      style={{ bottom: 'var(--tap-bar)', height: WAITER_DOCK_HEIGHT }}
    >
      <WaiterOrb />

      {/* The transcript. Tapping it opens the full conversation — the line is
          a summary, and a customer who wants the detail should not have to
          hunt for a separate control. */}
      <button
        type="button"
        data-testid="waiter-line"
        onClick={() => setExpanded(true)}
        className="press flex min-h-[var(--tap)] min-w-0 flex-1 items-center gap-[2cqw] text-left"
      >
        <span className="min-w-0 flex-1">
          <span
            className="block uppercase tracking-[0.28em] text-muted"
            style={{ fontSize: 'var(--step-label)' }}
          >
            {listening ? 'ouvindo' : phase === 'thinking' ? 'só um instante' : 'garçom'}
          </span>
          <span
            data-testid="waiter-line-text"
            className={[
              'block leading-tight',
              // Two lines maximum. A dock that grows with the answer would
              // shove the menu around mid-sentence.
              'line-clamp-2',
              error ? 'text-action' : live ? 'font-semibold text-ink' : 'text-ink',
            ].join(' ')}
            style={{ fontSize: 'var(--step-body)' }}
          >
            {line}
          </span>
        </span>
        <ChevronUp strokeWidth={3} className="size-[2.4cqw] shrink-0 text-muted" />
      </button>

      {/* Idle openers. They teach the affordance without a tutorial nobody
          would read, and they disappear the moment a conversation starts. */}
      {phase === 'idle' && turns.length === 0 && suggestions.length > 0 ? (
        <div className="hidden shrink-0 gap-[1.5cqw] min-[900px]:flex">
          {suggestions.slice(0, 2).map((text) => (
            <button
              key={text}
              type="button"
              data-testid={`waiter-suggestion-${text.slice(0, 12)}`}
              onClick={() => onSuggestion?.(text)}
              className="press flex min-h-[var(--tap)] items-center rounded-totem border-2 border-edge px-[2.5cqw] text-left leading-tight"
              style={{ fontSize: 'var(--step-label)', maxWidth: '22cqw' }}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}

      {/* Push to talk. The largest target on the strip, and the only red on it
          — the menu's red lives on CHECKOUT, and this dock is never on screen
          at the same time as a second red inside itself. */}
      <button
        type="button"
        data-testid="waiter-mic"
        aria-label={listening ? 'Parar de falar' : 'Falar com o garçom'}
        aria-pressed={listening}
        disabled={busy}
        onPointerDown={listening ? undefined : onTalkStart}
        onPointerUp={listening ? onTalkStop : undefined}
        onPointerCancel={listening ? onTalkStop : undefined}
        className={[
          'press grid size-[var(--tap-lg)] shrink-0 place-items-center rounded-full',
          listening ? 'bg-action text-white' : 'bg-ink text-white',
          'disabled:bg-disabled-bg disabled:text-disabled-fg',
        ].join(' ')}
      >
        {listening ? (
          <Square strokeWidth={3} className="size-[3cqw]" fill="currentColor" />
        ) : (
          <Mic strokeWidth={2.5} className="size-[3.4cqw]" />
        )}
      </button>
    </div>
  )
}
