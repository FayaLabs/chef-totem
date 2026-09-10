// Generated-media preparation only: validate alpha, trim empty padding, resize/encode.
// BURGER_SHARP_PATH=/path/to/sharp node scripts/prepare-burger-asset.mjs name master.png
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const sharp = require(process.env.BURGER_SHARP_PATH || 'sharp')
const [name, source] = process.argv.slice(2)
const names = ['brioche-top', 'brioche-bottom', 'australian-top', 'australian-bottom', 'gluten-free-top', 'gluten-free-bottom',
  'blend', 'smash', 'chicken', 'veggie', 'cheddar', 'prato', 'vegan-cheese', 'lettuce', 'tomato', 'onion', 'onion-crispy', 'bacon', 'egg', 'house-sauce', 'lemon-mayo']
if (!names.includes(name) || !source) throw new Error('Expected known burger asset name and master path')
const input = sharp(source)
const meta = await input.metadata()
if (!meta.hasAlpha) throw new Error(`${name}: rejected opaque background; regenerate with true alpha`)
const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
let left = info.width, top = info.height, right = -1, bottom = -1, empty = 0
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const alpha = data[(y * info.width + x) * info.channels + info.channels - 1]
  if (alpha < 8) { empty++; continue }
  left = Math.min(left, x); right = Math.max(right, x)
  top = Math.min(top, y); bottom = Math.max(bottom, y)
}
if (empty / (info.width * info.height) < .15 || right < left) throw new Error(`${name}: invalid cutout alpha`)
const destination = resolve('public/demo/maxburger/burger')
await mkdir(destination, { recursive: true })
const output = resolve(destination, `${name}.webp`)
const rendered = await sharp(source).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(output)
const manifestPath = resolve(destination, 'assets.json')
let manifest = {}
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
manifest[name] = { width: rendered.width, height: rendered.height }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`${name}: ${rendered.width}×${rendered.height}, ${rendered.size} bytes → ${output}`)
