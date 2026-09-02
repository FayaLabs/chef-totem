import { createDemoCatalog } from '@/menu/demo-catalog'
import { createSupabaseCatalog } from '@/menu/supabase-catalog'
import type { CatalogProvider } from '@/menu/types'

// `live` is the default. `demo` is opt-in and never a fallback: if the live
// catalog fails the panel says so, because a kiosk that invents a menu takes
// orders the kitchen will never see.
export function catalogProvider(): CatalogProvider {
  return import.meta.env.VITE_TOTEM_CATALOG === 'demo' ? createDemoCatalog() : createSupabaseCatalog()
}
