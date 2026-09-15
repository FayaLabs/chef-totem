import { useEffect } from 'react'
import { DesignCatalog } from '@/design/DesignCatalog'
import { installShowreelHatch, installShowreelIdle } from '@/demo/showreel'
import { FpsMeter } from '@/kiosk/FpsMeter'
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
import { Waiter } from '@/waiter/Waiter'
import { BurgerPilotScreen } from '@/burger/BurgerPilotScreen'

// The step IS the route. A kiosk has no URL bar, no deep links and no back
// button of its own, so a router would only add a second source of truth for
// where the customer is. The session store is that source.
//
// `?design` is the one exception: an internal catalog of every primitive, not
// reachable from any customer-facing tap.
/** O medidor de quadros só existe quando alguém pede para medir. */
function showsFps(): boolean {
  if (import.meta.env.VITE_TOTEM_FPS === 'on') return true
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fps')
}

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
  // O PIN de manutenção do shell não conhece React: ele só alcança `window`.
  // Ver `installShowreelHatch`.
  useEffect(installShowreelHatch, [])
  // E sozinho, depois de um tempo parado no repouso. Ver `installShowreelIdle`.
  useEffect(installShowreelIdle, [])
  useFullscreenOnFirstTouch()
  const step = useTotemSession((s) => s.step)

  const isDesign =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('design')
  const isBurgerPilot = import.meta.env.DEV && new URLSearchParams(window.location.search).has('burger-pilot')

  const Screen = SCREENS[step]

  return (
    <TotemViewport>
      {isBurgerPilot ? <BurgerPilotScreen /> : isDesign ? <DesignCatalog /> : Screen ? <Screen /> : <PlaceholderScreen step={step} />}
      {isDesign || isBurgerPilot ? null : <Waiter />}
      {/* O medidor NÃO aparece sozinho. Ele nasceu aceso porque durante o
          ajuste de desempenho era ele que dizia se o painel estava engasgando —
          e num corredor de feira o que ele diz para quem passa é "isto aqui é
          um protótipo". Liga com `?fps` (ou VITE_TOTEM_FPS=on) na hora de
          medir. Ver `kiosk/FpsMeter.tsx`. */}
      {showsFps() ? <FpsMeter /> : null}
    </TotemViewport>
  )
}
