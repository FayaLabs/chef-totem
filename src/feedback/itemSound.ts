export type ItemSound = 'add' | 'remove'

let context: AudioContext | null = null

function tone(audio: AudioContext, at: number, from: number, to: number, duration: number, volume: number, type: OscillatorType) {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(from, at)
  oscillator.frequency.exponentialRampToValueAtTime(to, at + duration)
  gain.gain.setValueAtTime(.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + .012)
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration)
  oscillator.connect(gain); gain.connect(audio.destination)
  oscillator.start(at); oscillator.stop(at + duration + .01)
}

/** A tiny shared Web Audio cue. It is invoked only inside customer gestures,
 * so it never talks over the waiter or makes noise when state changes by code. */
export function playItemSound(kind: ItemSound) {
  if (typeof window === 'undefined') return
  try {
    if (context?.state === 'closed') context = null
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime + .006
    if (kind === 'add') {
      // A food landing with enough midrange for small kiosk/laptop speakers.
      tone(context, now, 220, 110, .22, .13, 'sine')
      tone(context, now + .022, 680, 390, .14, .055, 'triangle')
      tone(context, now + .034, 1100, 720, .08, .024, 'sine')
    } else {
      // The inverse gesture reads as removal without sounding like an error.
      tone(context, now, 300, 620, .18, .09, 'sine')
      tone(context, now + .02, 740, 1180, .12, .04, 'triangle')
    }
  } catch {
    // Audio can be unavailable or blocked; choosing food must still work.
  }
}
