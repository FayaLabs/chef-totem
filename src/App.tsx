import { DesignCatalog } from '@/design/DesignCatalog'
import { TotemViewport } from '@/kiosk/TotemViewport'
import { useFullscreenOnFirstTouch, useKioskLock } from '@/kiosk/useKioskLock'
import { AttractScreen } from '@/screens/AttractScreen'
import { IdentifyScreen } from '@/screens/IdentifyScreen'
import { MenuScreen } from '@/screens/MenuScreen'
import { ModeScreen } from '@/screens/ModeScreen'
import { PaymentScreen } from '@/screens/PaymentScreen'
import { ReceiptScreen } from '@/screens/ReceiptScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import { useTotemSession, type TotemStep } from '@/session/useTotemSession'

// The step IS the route. A kiosk has no URL bar, no deep links and no back
// button of its own, so a router would only add a second source of truth for
// where the customer is. The session store is that source.
//
// `?design` is the one exception: an internal catalog of every primitive, not
// reachable from any customer-facing tap.
const SCREENS: Partial<Record<TotemStep, () => JSX.Element | null>> = {
  attract: AttractScreen,
  mode: ModeScreen,
  identify: IdentifyScreen,
  menu: MenuScreen,
  payment: PaymentScreen,
  receipt: ReceiptScreen,
}

export default function App() {
  useKioskLock()
  useFullscreenOnFirstTouch()
  const step = useTotemSession((s) => s.step)

  const isDesign =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('design')

  const Screen = SCREENS[step]

  return (
    <TotemViewport>
      {isDesign ? <DesignCatalog /> : Screen ? <Screen /> : <PlaceholderScreen step={step} />}
    </TotemViewport>
  )
}
