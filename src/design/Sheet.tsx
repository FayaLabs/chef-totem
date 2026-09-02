import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// The bottom sheet. Product detail, cart, payment method — all of it.
//
// A sheet rather than a page because the customer must not lose their place in
// the menu: they are mid-decision, and a full-screen navigation makes "go back
// and compare" cost two taps and a scroll position.
//
// DRAG TO DISMISS. Everyone arrives at a kiosk carrying a phone's muscle
// memory, and on a phone a bottom sheet is dragged away. Making the panel obey
// the gesture people already try is worth more here than on a phone, because a
// customer who feels the panel "doesn't work" gives up in front of a queue
// instead of hunting for the close button.
//
// The scrim is heavy (60%) on purpose: it is what says the menu behind is
// inert. A light scrim on a bright food photo reads as decoration, and
// customers keep tapping the dish underneath.
// ---------------------------------------------------------------------------

/** Past this many pixels the sheet is going away; below it, it springs back. */
const DISMISS_AFTER = 140

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Rendered against the bottom edge, outside the scrollable body. */
  footer?: ReactNode
  title?: string
  /**
   * Corpo sangrado: sem folga lateral e sem título no topo.
   *
   * Para o sheet cuja PRIMEIRA coisa é uma foto. Uma foto de comida com 6cqw
   * de branco em volta e um título acima dela é um cartão de catálogo; sangrada
   * até a borda, ela é o prato. A diferença é grande num painel de 27" onde a
   * foto é metade do argumento de venda.
   */
  bleed?: boolean
  children: ReactNode
  'data-testid'?: string
}

export function Sheet({ open, onClose, footer, title, bleed = false, children, ...rest }: SheetProps) {
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setDrag(0)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Only start a drag when the body is already at the top. Otherwise a
    // customer scrolling a long modifier list would fling the sheet away
    // mid-read.
    if ((body.current?.scrollTop ?? 0) > 0) return
    start.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (start.current === null) return
    // Downward only: dragging up must not detach the sheet from its edge.
    setDrag(Math.max(0, event.clientY - start.current))
  }

  const onPointerUp = () => {
    if (start.current === null) return
    start.current = null
    if (drag > DISMISS_AFTER) onClose()
    else setDrag(0)
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar"
        data-testid="sheet-scrim"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        style={{ opacity: Math.max(0.35, 1 - drag / 400) }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={rest['data-testid'] ?? 'sheet'}
        className="relative flex max-h-[86%] flex-col overflow-hidden rounded-t-sheet bg-white motion-safe:animate-[sheet-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          // No transition while the finger is down — the sheet must track it
          // exactly — and a spring back when it lifts.
          transition: start.current === null ? 'transform 220ms cubic-bezier(0.16,1,0.3,1)' : 'none',
        }}
      >
        {/* The grab area: the handle plus the title, so the whole top of the
            sheet is draggable rather than a 4px bar nobody can hit.

            Com a foto sangrada ele flutua sobre ela — mas só a FAIXA CENTRAL
            recebe toque. A primeira versão fazia a barra inteira interceptar, e
            o primeiro chip que rolasse para debaixo dela deixava de responder:
            o cliente tocava em "Média" e nada acontecia, sem nada na tela
            sugerindo por quê. */}
        <div
          className={[
            'shrink-0',
            bleed ? 'pointer-events-none absolute inset-x-0 top-0 z-10' : '',
          ].join(' ')}
        >
          <div
            data-testid="sheet-handle"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={[
              'pointer-events-auto cursor-grab touch-none pt-[2.2cqw]',
              bleed ? 'mx-auto w-[30cqw] pb-[2.5cqw]' : '',
            ].join(' ')}
          >
            {/* O puxador do iOS. Ele existia a 40% de opacidade sobre a linha
                divisória e simplesmente não era visto — e um gesto que a pessoa
                não sabe que existe é um gesto que não existe. Agora é sólido: é
                a única coisa na tela que diz "isto desce". */}
            <span
              aria-hidden
              className={[
                'mx-auto block h-[0.85cqw] w-[11cqw] rounded-full',
                // Em cima de uma foto, cinza sobre cinza some. Branco com
                // sombra sobrevive tanto a um prato claro quanto a um mármore
                // escuro.
                bleed ? 'bg-white/85 shadow-[0_0_0.6cqw_rgba(0,0,0,0.35)]' : 'bg-ink/25',
              ].join(' ')}
            />
            {title ? (
              <h2
                className="px-[6cqw] pb-[2cqw] pt-[2.5cqw] text-center font-display uppercase tracking-tight"
                style={{ fontSize: 'var(--step-title)' }}
              >
                {title}
              </h2>
            ) : (
              <span className="block pb-[2cqw]" />
            )}
          </div>
        </div>

        <div
          ref={body}
          className={[
            'min-h-0 flex-1 overflow-y-auto pb-[4cqw]',
            bleed ? 'px-0' : 'px-[6cqw]',
          ].join(' ')}
        >
          {children}
        </div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>
  )
}
