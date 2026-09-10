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
  /** Qual restaurante de demonstração está no ar. Ver src/demo/tenants.ts. */
  readonly VITE_TOTEM_DEMO_TENANT?: 'cafe-sabor' | 'pizza-house' | 'maxburger'
  readonly VITE_TOTEM_ASSISTANT?: string
  readonly VITE_TOTEM_WAITER?: 'scripted' | 'text' | 'voice'
  readonly VITE_TOTEM_TERMINAL_MOCK?: string
  /**
   * Dev only. Mint the realtime ephemeral secret from this URL instead of the
   * `totem-voice-token` edge function, so voice can be tested without Supabase.
   * Ignored in production builds — see mintToken in waiter/realtime-transport.
   */
  readonly VITE_TOTEM_VOICE_TOKEN_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * What `electron/preload.cjs` exposes when the totem runs inside the shell.
 * Absent in a plain browser, which is how the app tells the two apart.
 */
interface FayzShellBridge {
  isShell: true
  printRaw(bytes: Uint8Array): Promise<{ ok: boolean; message?: string }>
  printerName(): Promise<string>
  requestExit(pin: string): Promise<{ ok: boolean }>
}

interface Window {
  fayzShell?: FayzShellBridge
}
