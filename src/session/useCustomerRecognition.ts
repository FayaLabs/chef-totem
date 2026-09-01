import { totemConfig } from '@/config/totem.config'
import type { TotemCustomer } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// Who is standing at the panel — if they feel like saying.
//
// The interface is shaped for the camera from day one even though the camera is
// off: `confidence` and the `recognising` state only make sense for a driver
// that guesses. Building the manual driver to that shape means the camera lands
// later without touching the screen that renders it.
//
// It is also why recognition NEVER blocks: the identify screen renders its skip
// with the same weight as its confirm, and a driver that is thinking about it
// changes nothing about what the customer can do next.
// ---------------------------------------------------------------------------

export type RecognitionStatus = 'idle' | 'recognising' | 'recognised' | 'unknown' | 'unavailable'

export interface RecognitionResult {
  status: RecognitionStatus
  customer: TotemCustomer | null
  /** 0-1. The manual driver is always 1: the customer typed it themselves. */
  confidence: number
}

export interface RecognitionDriver {
  readonly id: 'manual' | 'camera'
  /** Called when the identify screen mounts. */
  begin(): Promise<RecognitionResult>
  /** Called on unmount — releases the camera, if there is one. */
  end(): void
}

/** V1. The customer types, or does not. Nothing watches them. */
const manualDriver: RecognitionDriver = {
  id: 'manual',
  begin: async () => ({ status: 'idle', customer: null, confidence: 0 }),
  end: () => undefined,
}

/**
 * Off behind `totem.camera`.
 *
 * Deliberately a stub and not a half-implementation: face recognition on a
 * queue of unconsenting customers is a legal and ethical decision, not a
 * feature flag, and whoever turns it on should have to write this themselves
 * with the consent screen that has to come with it.
 */
const cameraDriver: RecognitionDriver = {
  id: 'camera',
  begin: async () => ({ status: 'unavailable', customer: null, confidence: 0 }),
  end: () => undefined,
}

export function recognitionDriver(): RecognitionDriver {
  return totemConfig.flags.camera ? cameraDriver : manualDriver
}
