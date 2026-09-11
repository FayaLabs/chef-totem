// The drawing of a burger still, shared by the worker (still-worker.ts) and
// the main-thread fallback in BurgerStill.tsx. Both paint from the same plan,
// so the picture can't drift between them.

export interface StillDraw { url: string; centerX: number; centerY: number; width: number }
export interface StillShadow { centerX: number; centerY: number; scaleX: number; scaleY: number }
export interface StillPlan { size: number; shadow: StillShadow | null; draws: StillDraw[] }
export type StillRequest = StillPlan & { id: number }
export type StillReply = { id: number; url: string } | { id: number; error: string }

type Surface = CanvasState & CanvasTransform & CanvasRect & CanvasFillStrokeStyles & CanvasDrawImage
export interface StillImage { width: number; height: number; source: CanvasImageSource }

export function paintStill(ctx: Surface, plan: StillPlan, images: StillImage[]) {
  const { shadow } = plan
  if (shadow) {
    ctx.save()
    ctx.translate(shadow.centerX, shadow.centerY)
    ctx.scale(shadow.scaleX, shadow.scaleY)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    gradient.addColorStop(0, '#0009'); gradient.addColorStop(.24, '#0007')
    gradient.addColorStop(.5, '#0003'); gradient.addColorStop(.72, '#0000')
    ctx.fillStyle = gradient
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
  images.forEach((img, i) => {
    const draw = plan.draws[i], h = draw.width * img.height / img.width
    ctx.drawImage(img.source, draw.centerX - draw.width / 2, draw.centerY - h / 2, draw.width, h)
  })
}
