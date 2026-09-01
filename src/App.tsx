import { DesignCatalog } from '@/design/DesignCatalog'
import { TotemViewport } from '@/kiosk/TotemViewport'
import { useFullscreenOnFirstTouch, useKioskLock } from '@/kiosk/useKioskLock'
import { AttractScreen } from '@/screens/AttractScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import { useTotemSession } from '@/session/useTotemSession'

// The step IS the route. A kiosk has no URL bar, no deep links and no back
// button of its own, so a router would only add a second source of truth for
// where the customer is. The session store is that source.
//
// `?design` is the one exception: an internal catalog of every primitive, not
// reachable from any customer-facing tap.
export default function App() {
  useKioskLock()
  useFullscreenOnFirstTouch()
  const step = useTotemSession((s) => s.step)

  const isDesign =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('design')

  return (
    <TotemViewport>
      {isDesign ? (
        <DesignCatalog />
      ) : step === 'attract' ? (
        <AttractScreen />
      ) : (
        <PlaceholderScreen step={step} />
      )}
    </TotemViewport>
  )
}
