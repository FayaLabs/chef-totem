import { TotemViewport } from '@/kiosk/TotemViewport'
import { useFullscreenOnFirstTouch, useKioskLock } from '@/kiosk/useKioskLock'
import { AttractScreen } from '@/screens/AttractScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import { useTotemSession } from '@/session/useTotemSession'

// The step IS the route. A kiosk has no URL bar, no deep links and no back
// button of its own, so a router would only add a second source of truth for
// where the customer is. The session store is that source.
export default function App() {
  useKioskLock()
  useFullscreenOnFirstTouch()
  const step = useTotemSession((s) => s.step)

  return (
    <TotemViewport>
      {step === 'attract' ? <AttractScreen /> : <PlaceholderScreen step={step} />}
    </TotemViewport>
  )
}
