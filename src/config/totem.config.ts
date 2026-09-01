// ---------------------------------------------------------------------------
// What this specific machine is. One totem per unit, each with its own id, so
// an order can be traced back to the panel it was placed on.
// ---------------------------------------------------------------------------

export interface TotemFlags {
  /** Floating AI assistant (M8). Off until the voice session is real. */
  assistant: boolean
  /** Face recognition at the identify step (M2). Off — manual entry is V1. */
  camera: boolean
  /** Card machine driver (M5). Off = the mock driver approves. */
  terminal: boolean
  /** Receipt printer (M6). Off = browser print dialog. */
  printer: boolean
}

export interface TotemConfig {
  totemId: string
  tenantId: string
  unitId: string
  currency: string
  locale: string
  timeZone: string
  /** Seconds of no touch before the "still there?" prompt (M7). */
  idleSeconds: number
  /** Seconds the prompt counts down before resetting the session (M7). */
  idleGraceSeconds: number
  flags: TotemFlags
}

const env = import.meta.env

export const totemConfig: TotemConfig = {
  totemId: env.VITE_TOTEM_ID ?? 'totem-dev',
  tenantId: env.VITE_TENANT_ID ?? '',
  unitId: env.VITE_UNIT_ID ?? '',
  currency: 'BRL',
  locale: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
  idleSeconds: 60,
  idleGraceSeconds: 20,
  flags: {
    assistant: false,
    camera: false,
    terminal: false,
    printer: false,
  },
}
