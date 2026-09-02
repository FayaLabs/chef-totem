import { useWaiter, type WaiterPhase } from '@/waiter/useWaiter'

// ---------------------------------------------------------------------------
// The waiter's face.
//
// It is not decoration. In a dining room a customer cannot tell a panel that is
// listening from one that has frozen, and that uncertainty is what sends people
// to the till queue. The orb answers one question continuously: is it my turn
// to talk, or its turn?
//
// Four states, four unmistakable behaviours — legible from a metre away and
// without reading a word:
//   idle       slow breath          "I'm here"
//   listening  reacts to your voice "I can hear you"
//   thinking   fast orbit           "hold on"
//   speaking   waveform             "I'm talking"
//
// Under prefers-reduced-motion everything freezes and the ring colour carries
// the state alone. Which is why the colours differ, not just the animation.
// ---------------------------------------------------------------------------

const RING: Record<WaiterPhase, string> = {
  off: 'transparent',
  idle: 'var(--color-accent, #A16207)',
  listening: 'var(--color-action, #DC2626)',
  thinking: 'var(--color-accent, #A16207)',
  speaking: 'var(--color-ink, #0B0B0C)',
  error: '#B91C1C',
}

export function WaiterOrb({ size = '13cqw' }: { size?: string }) {
  const phase = useWaiter((s) => s.phase)
  const level = useWaiter((s) => s.level)

  // While listening the orb swells with the customer's own voice. This is the
  // proof that the microphone is live — a static "listening" label is a claim,
  // this is evidence.
  const swell = phase === 'listening' ? 1 + Math.min(0.28, level * 0.4) : 1

  return (
    <span
      data-testid="waiter-orb"
      data-phase={phase}
      aria-hidden
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      {/* The halo: only present when the waiter is doing something. */}
      <span
        className={[
          'absolute inset-0 rounded-full',
          phase === 'listening' ? 'motion-safe:animate-[waiter-halo_1.6s_ease-out_infinite]' : '',
          phase === 'thinking' ? 'motion-safe:animate-[waiter-halo_0.9s_ease-out_infinite]' : '',
        ].join(' ')}
        style={{ background: RING[phase], opacity: phase === 'idle' || phase === 'off' ? 0 : 0.22 }}
      />

      <span
        className={[
          'relative grid size-[78%] place-items-center rounded-full',
          phase === 'idle' ? 'motion-safe:animate-[waiter-breathe_3.4s_ease-in-out_infinite]' : '',
        ].join(' ')}
        style={{
          background: 'var(--color-ink, #0B0B0C)',
          boxShadow: `0 0 0 0.4cqw ${RING[phase]}`,
          transform: `scale(${swell})`,
          transition: 'transform 90ms linear, box-shadow 200ms ease-out',
        }}
      >
        {phase === 'speaking' ? <SpeakingBars /> : <IdleDot phase={phase} />}
      </span>
    </span>
  )
}

/** Three bars that move only while the waiter has the floor. */
function SpeakingBars() {
  return (
    <span className="flex items-end gap-[0.5cqw]" style={{ height: '35%' }}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="w-[0.7cqw] rounded-full bg-white motion-safe:animate-[waiter-bar_0.7s_ease-in-out_infinite]"
          style={{ height: '100%', animationDelay: `${index * 0.13}s` }}
        />
      ))}
    </span>
  )
}

function IdleDot({ phase }: { phase: WaiterPhase }) {
  return (
    <span
      className="rounded-full bg-white"
      style={{
        width: '18%',
        height: '18%',
        opacity: phase === 'error' ? 0.4 : 0.9,
        transition: 'opacity 200ms ease-out',
      }}
    />
  )
}
