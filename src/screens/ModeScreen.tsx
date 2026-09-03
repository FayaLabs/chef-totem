import { Store, ShoppingBag } from 'lucide-react'
import { MediaBackdrop } from '@/design'
import { totemConfig } from '@/config/totem.config'
import { useTotemSession } from '@/session/useTotemSession'
import { useWaiterDockInset } from '@/waiter/presence'

// ---------------------------------------------------------------------------
// Eat here or take it away — asked first because it can change the price (and,
// in Brazil, the tax) of everything that follows.
//
// Two options and nothing else on the screen. Every extra control here is a
// decision taken in front of a queue.
// ---------------------------------------------------------------------------

export function ModeScreen() {
  const chooseMode = useTotemSession((s) => s.chooseMode)
  const ticket = useTotemSession((s) => s.ticket)
  const { media } = totemConfig
  // Esta tela não tem barra de baixo: a faixa do garçom, quando ele foi
  // chamado, encosta no rodapé e os dois cartões sobem para não ficar debaixo
  // dela. Sem isto, o "levar" fica com a metade de baixo escondida.
  const dock = useWaiterDockInset()

  return (
    <div data-testid="screen-mode" className="absolute inset-0 flex flex-col justify-end text-white">
      <MediaBackdrop videoSrc={media.videoUrl} posterSrc={media.posterUrl} scrim={60} />

      <div className="relative z-10 px-[6cqw]" style={{ paddingBottom: `calc(${dock} + 10cqw)` }}>
        <h1
          className="mb-[6cqw] text-center font-display uppercase leading-[0.9] tracking-tight"
          style={{ fontSize: 'var(--step-display)' }}
        >
          {totemConfig.copy.modeTitle}
        </h1>

        <div className="grid grid-cols-2 gap-[4cqw]">
          <ModeCard
            testId="mode-dine-in"
            label={totemConfig.copy.modeHere}
            icon={<Store strokeWidth={2} className="size-[9cqw]" />}
            onClick={() => chooseMode('dine_in')}
          />
          <ModeCard
            testId="mode-takeaway"
            label={totemConfig.copy.modeAway}
            icon={<ShoppingBag strokeWidth={2} className="size-[9cqw]" />}
            onClick={() => chooseMode('takeaway')}
          />
        </div>

        {ticket ? (
          <p
            className="tnum mt-[6cqw] text-center uppercase tracking-[0.3em] text-white/60"
            style={{ fontSize: 'var(--step-label)' }}
          >
            senha {ticket}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ModeCard({
  testId,
  label,
  icon,
  onClick,
}: {
  testId: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      // Tall on purpose: these two are the whole screen, so they should read as
      // a choice between two places, not two list items.
      className="press flex min-h-[38cqw] flex-col items-center justify-center gap-[3cqw] rounded-totem bg-white text-ink"
    >
      {icon}
      <span className="font-semibold uppercase tracking-[0.16em]" style={{ fontSize: 'var(--step-body)' }}>
        {label}
      </span>
    </button>
  )
}
