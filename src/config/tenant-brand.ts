import { useEffect, useState } from 'react'
import { totemConfig } from '@/config/totem.config'
import { isDemoCatalog } from '@/demo/mode'
import { deviceClient } from '@/menu/device-session'

// ---------------------------------------------------------------------------
// Whose restaurant this is.
//
// `totemConfig.brand` only ever had a real answer in demo mode: a LIVE panel
// fell through to the hardcoded 'Chef'. That is wrong in four visible places at
// once — the attract screen, the printed ticket, the WhatsApp receipt and the
// assistant's own persona all told the customer the wrong restaurant's name.
//
// The name is already in the pool (`tenants.name`), and the panel is already
// signed in as a member of that tenant, so no new credential and no new env var
// is involved: it reads the row it is allowed to read.
//
// Resolved once at boot and cached, because the four callers are synchronous
// and turning a printed receipt into a promise to fetch a string the panel has
// known since it started is the wrong trade.
// ---------------------------------------------------------------------------

let resolved: string | null = null
let inflight: Promise<string> | null = null

/**
 * The tenant's name, or the configured fallback until it has loaded.
 *
 * Never throws and never blocks: a panel that cannot reach the pool still
 * prints a ticket, it just prints the fallback name on it.
 */
export function brandName(): string {
  return resolved ?? totemConfig.brand.name
}

/** Primes {@link brandName}. Safe to call more than once. */
export function loadTenantBrand(): Promise<string> {
  // A demo house names itself. Reading the pool here would let whichever tenant
  // the panel's credentials point at overwrite it — which is exactly what put
  // "Artorius" on a MaxBurger ticket.
  if (isDemoCatalog()) return Promise.resolve(brandName())
  if (resolved) return Promise.resolve(resolved)
  inflight ??= (async () => {
    try {
      const db = await deviceClient()
      const { data } = await db
        .from('tenants')
        .select('name')
        .eq('id', totemConfig.tenantId)
        .maybeSingle()
      const name = typeof data?.name === 'string' ? data.name.trim() : ''
      if (name) resolved = name
    } catch {
      // Offline, unconfigured, or demo mode. The fallback is already correct
      // for demo, and a boot that fails here must not fail the panel.
    } finally {
      inflight = null
    }
    return brandName()
  })()
  return inflight
}

/**
 * The tenant's name, re-rendering once it arrives.
 *
 * Only the attract screen needs this: it is on the glass before the pool has
 * answered, and it is the one place a customer would read the wrong name for
 * several seconds. Everything else runs after boot and reads {@link brandName}.
 */
export function useTenantBrand(): string {
  const [name, setName] = useState(brandName)
  useEffect(() => {
    let alive = true
    void loadTenantBrand().then((resolvedName) => { if (alive) setName(resolvedName) })
    return () => { alive = false }
  }, [])
  return name
}
