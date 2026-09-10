import { useEffect, useState } from 'react'
import dimensions from '../../public/demo/maxburger/burger/assets.json'
import { BURGER_ASSETS, burgerPoses, burgerShadowPose, type BurgerLayer } from './pilot'
import './burger.css'

export { dimensions as burgerDimensions }
const images = new Map<string, Promise<HTMLImageElement>>()
const stills = new Map<string, Promise<string>>()

function loadImage(asset: string) {
  let pending = images.get(asset)
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => { images.delete(asset); reject(new Error(`Missing burger asset: ${asset}`)) }
      img.src = `${BURGER_ASSETS}/${asset}.webp`
    })
    images.set(asset, pending)
  }
  return pending
}

/** A real static image of the SAME composition, cached rather than animated.
 * Local assets only; no remote image request, pricing state or persistence. */
function still(layers: BurgerLayer[], key: string) {
  const cached = stills.get(key)
  if (cached) return cached
  const pending = Promise.all(layers.map((layer) => loadImage(layer.asset))).then((loaded) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 640
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    const poses = burgerPoses(layers, dimensions, false)
    const shadow = burgerShadowPose(layers, poses, dimensions, false)
    if (shadow) {
      ctx.save()
      ctx.translate((shadow.left + shadow.width / 2) * 6.4, (shadow.top + shadow.height / 2) * 6.4)
      ctx.scale(shadow.width * 3.2, shadow.height * 3.2)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      gradient.addColorStop(0, '#0009'); gradient.addColorStop(.24, '#0007')
      gradient.addColorStop(.5, '#0003'); gradient.addColorStop(.72, '#0000')
      ctx.fillStyle = gradient
      ctx.fillRect(-1, -1, 2, 2)
      ctx.restore()
    }
    loaded.forEach((img, i) => {
      const pose = poses[i], w = pose.width * 6.4, h = w * img.naturalHeight / img.naturalWidth
      ctx.drawImage(img, pose.centerX * 6.4 - w / 2, pose.centerY * 6.4 - h / 2, w, h)
    })
    return canvas.toDataURL('image/webp', .9)
  }).catch((error) => { stills.delete(key); throw error })
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
  return <span className={`burger-still ${className}`} data-testid="burger-still" data-ready={Boolean(resolved)} data-fallback={Boolean(resolved?.failed)} aria-busy={!resolved}>
    {src ? <img src={src} alt={alt} draggable={false} className="size-full object-contain" />
      : <span className="sr-only">{alt || 'Preparando imagem do burger'}</span>}
    {resolved?.failed && <span className="burger-photo-note">Imagem de referência</span>}
  </span>
}
