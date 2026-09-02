import { PersonStanding } from 'lucide-react'
import { useReachMode } from '@/design/useReachMode'

// Lives in a reserved slot inside BottomBar, not floating over the content —
// see BottomBar for why. Always low on the panel: a control that exists for
// people who cannot reach the top must never itself live at the top.
export function ReachModeToggle() {
  const enabled = useReachMode((s) => s.enabled)
  const toggle = useReachMode((s) => s.toggle)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Voltar a tela inteira' : 'Baixar a tela'}
      data-testid="reach-toggle"
      className={[
        'press grid size-[var(--tap)] place-items-center rounded-full',
        enabled ? 'bg-action text-white' : 'bg-white text-ink border-2 border-edge',
      ].join(' ')}
    >
      <PersonStanding strokeWidth={2.5} className="size-[4cqw]" />
    </button>
  )
}
