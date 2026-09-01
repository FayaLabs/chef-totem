/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_TOTEM_ID?: string
  readonly VITE_TENANT_ID?: string
  readonly VITE_UNIT_ID?: string
  readonly VITE_TOTEM_DEVICE_EMAIL?: string
  readonly VITE_TOTEM_DEVICE_PASSWORD?: string
  readonly VITE_TOTEM_CATALOG?: 'live' | 'demo'
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
