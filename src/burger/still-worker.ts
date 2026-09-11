// ---------------------------------------------------------------------------
// Builds burger stills off the main thread: fetch and decode the layer images,
// draw them, encode WebP, and hand back a data URL.
//
// On the panel (Intel N100) the same work done on the main thread cost about
// 1.4 s of `canvas.toDataURL` plus 0.6 s of synchronous image decode as the
// menu opened, which showed up as frames of 333–450 ms. Here it runs beside the
// page instead of in front of it.
// ---------------------------------------------------------------------------

import { paintStill, type StillPlan, type StillReply, type StillRequest } from './still-paint'

// Decoded once and reused: the same bun or patty appears in most compositions,
// and createImageBitmap is what keeps that decode off the page.
const bitmaps = new Map<string, Promise<ImageBitmap>>()

function bitmap(url: string) {
  let pending = bitmaps.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Missing burger asset: ${url}`)
        return res.blob()
      })
      .then((blob) => createImageBitmap(blob))
    pending.catch(() => bitmaps.delete(url))
    bitmaps.set(url, pending)
  }
  return pending
}

async function compose(plan: StillPlan) {
  const loaded = await Promise.all(plan.draws.map((draw) => bitmap(draw.url)))
  const canvas = new OffscreenCanvas(plan.size, plan.size)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  paintStill(ctx, plan, loaded.map((img) => ({ width: img.width, height: img.height, source: img })))
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: .9 })
  // A data URL, like the main-thread path returns: a string the garbage
  // collector reclaims. A blob URL would have to be revoked by hand, at the
  // exact moment no <img> still shows it.
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${blob.type};base64,${btoa(binary)}`
}

self.onmessage = (event: MessageEvent<StillRequest>) => {
  const { id, ...plan } = event.data
  compose(plan).then(
    (url) => self.postMessage({ id, url } satisfies StillReply),
    (error: unknown) => self.postMessage({ id, error: error instanceof Error ? error.message : String(error) } satisfies StillReply),
  )
}
