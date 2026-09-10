// Lossless geometry: resize/encode only. Creative edits and cutouts are generated with imagegen.
// Usage: PIZZA_SHARP_PATH=/path/to/sharp node scripts/prepare-pizza-asset.mjs name /path/to/master.png
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const sharp = require(process.env.PIZZA_SHARP_PATH || 'sharp')
const [name, source] = process.argv.slice(2)
if (!/^(calabresa|quatro-queijos|margherita|pepperoni|diavola|board)$/.test(name ?? '') || !source) {
  throw new Error('Expected asset name and generated master path')
}
const input = sharp(source)
const meta = await input.metadata()
if (!meta.hasAlpha) throw new Error(`${name}: master needs genuine transparency, not a painted grid`)
const destination = resolve('public/demo/pizza-house/pizza')
await mkdir(destination, { recursive: true })
const output = resolve(destination, `${name}.webp`)
await input.resize(1024, 1024, { fit: 'contain', background: '#00000000' }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(output)
console.log(`${name}: ${meta.width}×${meta.height} → ${output}`)
