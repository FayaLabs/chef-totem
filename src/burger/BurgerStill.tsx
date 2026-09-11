import { useEffect, useState } from 'react'
import dimensions from '../../public/demo/maxburger/burger/assets.json'
import { BURGER_ASSETS, burgerPoses, burgerShadowPose, type BurgerLayer } from './pilot'
import { paintStill, type StillPlan, type StillReply } from './still-paint'
import './burger.css'

export { dimensions as burgerDimensions }
const STILL_SIZE = 640
/** Poses are in percent of the scene; the still is STILL_SIZE px square. */
const SCALE = STILL_SIZE / 100
const images = new Map<string, Promise<HTMLImageElement>>()
const stills = new Map<string, Promise<string>>()

/** Where each layer and the contact shadow land on the still. */
function stillPlan(layers: BurgerLayer[]): StillPlan {
  const poses = burgerPoses(layers, dimensions, false)
  const shadow = burgerShadowPose(layers, poses, dimensions, false)
  return {
    size: STILL_SIZE,
    shadow: shadow && {
      centerX: (shadow.left + shadow.width / 2) * SCALE,
      centerY: (shadow.top + shadow.height / 2) * SCALE,
      scaleX: shadow.width * SCALE / 2,
      scaleY: shadow.height * SCALE / 2,
    },
    // Absolute, because the worker resolves relative URLs against its own
    // script, not the page.
    draws: layers.map((layer, i) => ({
      url: new URL(`${BURGER_ASSETS}/${layer.asset}.webp`, document.baseURI).href,
      centerX: poses[i].centerX * SCALE,
      centerY: poses[i].centerY * SCALE,
      width: poses[i].width * SCALE,
    })),
  }
}

function loadImage(url: string) {
  let pending = images.get(url)
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => { images.delete(url); reject(new Error(`Missing burger asset: ${url}`)) }
      img.src = url
    })
    images.set(url, pending)
  }
  return pending
}

/** Fallback for engines without module workers or OffscreenCanvas. This is
 * the path that used to block the panel's main thread; it runs only when the
 * worker can't. */
async function composeOnMain(plan: StillPlan) {
  const loaded = await Promise.all(plan.draws.map((draw) => loadImage(draw.url)))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = plan.size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  paintStill(ctx, plan, loaded.map((img) => ({ width: img.naturalWidth, height: img.naturalHeight, source: img })))
  return canvas.toDataURL('image/webp', .9)
}

let worker: Worker | null | undefined
let nextId = 0
const waiting = new Map<number, { plan: StillPlan; resolve: (url: string) => void; reject: (error: Error) => void }>()

function stillWorker() {
  if (worker !== undefined) return worker
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') return (worker = null)
  try {
    worker = new Worker(new URL('./still-worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return (worker = null)
  }
  worker.onmessage = (event: MessageEvent<StillReply>) => {
    const job = waiting.get(event.data.id)
    if (!job) return
    waiting.delete(event.data.id)
    if ('url' in event.data) job.resolve(event.data.url)
    else job.reject(new Error(event.data.error))
  }
  // A worker that can't start (an old engine, a blocked script) must not leave
  // stills pending forever: finish them here and stop using it.
  worker.onerror = () => {
    worker?.terminate()
    worker = null
    for (const [id, job] of waiting) {
      waiting.delete(id)
      composeOnMain(job.plan).then(job.resolve, job.reject)
    }
  }
  return worker
}

function compose(plan: StillPlan) {
  const target = stillWorker()
  if (!target) return composeOnMain(plan)
  return new Promise<string>((resolve, reject) => {
    const id = ++nextId
    waiting.set(id, { plan, resolve, reject })
    target.postMessage({ id, ...plan })
  })
}

/** A real static image of the SAME composition, cached rather than animated.
 * Local assets only; no remote image request, pricing state or persistence. */
function still(layers: BurgerLayer[], key: string) {
  const cached = stills.get(key)
  if (cached) return cached
  const pending = compose(stillPlan(layers)).catch((error) => { stills.delete(key); throw error })
  if (stills.size >= 32) stills.delete(stills.keys().next().value!)
  stills.set(key, pending)
  return pending
}

export function BurgerStill({ layers, alt = '', fallback, className = '' }: {
  layers: BurgerLayer[]; alt?: string; fallback?: string; className?: string
}) {
  const key = JSON.stringify(layers)
  const [result, setResult] = useState<{ key: string; url?: string; failed?: boolean }>()
  useEffect(() => {
    let current = true
    still(JSON.parse(key), key).then((url) => { if (current) setResult({ key, url }) })
      .catch(() => { if (current) setResult({ key, failed: true }) })
    return () => { current = false }
  }, [key])
  const resolved = result?.key === key ? result : undefined
  const src = resolved?.url ?? (resolved?.failed ? fallback : result?.url)
  // `data-shown` e `data-ready` não são a mesma pergunta, e o fade depende da
  // primeira. `ready` cai para falso a cada recomposição — trocar o pão,
  // tirar a cebola — e o fade preso nele pisca a imagem inteira a cada toque,
  // que é exatamente o oposto do que ele existe para fazer. `shown` diz se já
  // existe ALGUMA imagem na tela: vira verdadeiro uma vez, na primeira
  // montagem, e daí em diante a troca é imagem por imagem, sem apagão no meio.
  return <span className={`burger-still ${className}`} data-testid="burger-still" data-ready={Boolean(resolved)} data-shown={Boolean(src)} data-fallback={Boolean(resolved?.failed)} aria-busy={!resolved}>
    {src ? <img src={src} alt={alt} draggable={false} className="size-full object-contain" />
      : <span className="sr-only">{alt || 'Preparando imagem do burger'}</span>}
    {resolved?.failed && <span className="burger-photo-note">Imagem de referência</span>}
  </span>
}
