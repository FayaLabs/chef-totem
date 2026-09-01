import { useEffect, useState } from 'react'
import { catalogProvider } from '@/menu/provider'
import type { TotemCatalog } from '@/menu/types'

type State =
  | { status: 'loading' }
  | { status: 'ready'; catalog: TotemCatalog }
  | { status: 'error'; message: string }

export function useCatalog(): State & { reload: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    catalogProvider()
      .load()
      .then((catalog) => {
        if (cancelled) return
        setState({ status: 'ready', catalog })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // Never fall back to the demo menu here: a panel that invents a menu
        // when its backend is down takes orders the kitchen never sees.
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return { ...state, reload: () => setAttempt((n) => n + 1) }
}
