import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Reach mode.
//
// A 27" panel in portrait is roughly 60cm of glass. Mounted at a normal kiosk
// height, the top third is out of comfortable reach for a shorter customer and
// out of ANY reach for someone seated — which in most of the world is a legal
// problem, not only a rude one.
//
// The fix pushes the whole interface down into the lower part of the panel and
// lets the content scroll inside what is left. It deliberately does NOT scale
// the UI down: shrinking the interface shrinks the tap targets, which makes it
// harder to use for exactly the people who turned it on.
// ---------------------------------------------------------------------------

/** Share of the panel height surrendered at the top when reach mode is on. */
export const REACH_INSET_RATIO = 0.38

interface ReachModeState {
  enabled: boolean
  toggle: () => void
  set: (enabled: boolean) => void
}

export const useReachMode = create<ReachModeState>((set, get) => ({
  enabled: false,
  toggle: () => set({ enabled: !get().enabled }),
  set: (enabled) => set({ enabled }),
}))
