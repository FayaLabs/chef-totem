import { useEffect, useState } from 'react'
import { catalogProvider } from '@/menu/provider'
import type { TotemCatalog } from '@/menu/types'
import { PIZZA_ASSETS } from '@/pizza/composition'

// ---------------------------------------------------------------------------
// The catalog, fetched BEFORE anyone asks for it.
//
// Loading it when the menu screen mounts measured 3.2s on a warm connection:
// device sign-in, then six queries. The customer spends that staring at a
// skeleton, having already done everything asked of them — which is exactly
// how a panel earns "esse totem é lento" from someone standing in a queue.
//
// But the customer takes three taps to get here, and every one of them is a
// second or more of human time. So the fetch starts at the attract screen and
// the menu just awaits a promise that is usually already settled.
//
// The promise is module-level and shared: two screens asking for the catalog
// get one network round trip, not two.
// ---------------------------------------------------------------------------

let inflight: Promise<TotemCatalog> | null = null

/**
 * O último cardápio carregado, para quem não é componente.
 *
 * O hook devolve estado de React, e quem precisa do cardápio fora de um render
 * — o garçom apontando para um prato enquanto fala — não tem como assinar um
 * `useState`. Guardar o resolvido aqui não cria uma segunda fonte: é o MESMO
 * objeto que a promessa devolveu, e ele só existe depois de ela resolver.
 */
let loaded: TotemCatalog | null = null

/** O cardápio já carregado, ou null se a busca ainda não terminou. */
export function catalogNow(): TotemCatalog | null {
  return loaded
}

/** Start (or reuse) the catalog fetch. Safe to call as often as you like. */
export function prefetchCatalog(): Promise<TotemCatalog> {
  inflight ??= catalogProvider()
    .load()
    .then((catalog) => {
      // Decode composition layers while the visitor is identifying themselves.
      // A failed image cannot block the catalog or any purchase.
      if (typeof Image !== 'undefined' && catalog.products.some((p) => p.pizza)) {
        const urls = new Set([`${PIZZA_ASSETS}/board.webp`, ...catalog.products.flatMap((p) => p.pizza ? [p.pizza.imageUrl] : [])])
        for (const url of urls) {
          const picture = new Image()
          picture.src = url
          void picture.decode().catch(() => {})
        }
      }
      loaded = catalog
      return catalog
    })
    .catch((error: unknown) => {
      // A failed fetch must not be cached as a permanent failure: the panel
      // has a retry button and the store may simply have blinked.
      inflight = null
      throw error
    })
  return inflight
}

/** Drop the cache — the operator's "force refresh", and the retry button. */
export function invalidateCatalog(): void {
  inflight = null
  loaded = null
}

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
    prefetchCatalog()
      .then((catalog) => {
        if (!cancelled) setState({ status: 'ready', catalog })
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

  return {
    ...state,
    reload: () => {
      invalidateCatalog()
      setAttempt((n) => n + 1)
    },
  }
}
