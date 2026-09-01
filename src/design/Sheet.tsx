import { useEffect, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// The bottom sheet. Product detail, cart, payment method — all of it.
//
// A sheet rather than a page because the customer must not lose their place in
// the menu: they are mid-decision, and a full-screen navigation makes "go back
// and compare" cost two taps and a scroll position.
//
// The scrim is heavy (60%) on purpose: it is the thing that says the menu
// behind is inert. A light scrim on a bright food photo reads as decoration and
// customers keep tapping the dish underneath.
// ---------------------------------------------------------------------------

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Rendered against the bottom edge, outside the scrollable body. */
  footer?: ReactNode
  title?: string
  children: ReactNode
  'data-testid'?: string
}

export function Sheet({ open, onClose, footer, title, children, ...rest }: SheetProps) {
  // Escape closes it — for the operator with a keyboard, and for Playwright.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar"
        data-testid="sheet-scrim"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={rest['data-testid'] ?? 'sheet'}
        // Enters from the bottom edge it is anchored to. Exit is handled by
        // unmount — a kiosk never needs to watch a sheet leave.
        className="relative flex max-h-[86%] flex-col overflow-hidden rounded-t-sheet bg-white motion-safe:animate-[sheet-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        {title ? (
          <h2
            className="shrink-0 px-[6cqw] pb-[2cqw] pt-[5cqw] text-center font-display uppercase tracking-tight"
            style={{ fontSize: 'var(--step-title)' }}
          >
            {title}
          </h2>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-[6cqw] pb-[4cqw]">{children}</div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>
  )
}
