import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fayzVite } from '@fayz-ai/sdk/vite'

// The SDK's appShellPwa emits `display: "standalone"` and takes no override.
// On a kiosk that leaves the OS status bar on screen — something to swipe, a
// clock to tap, a way out of the app. A totem wants "fullscreen".
//
// Remove this once AppShellPwaOptions grows a `display` option; it is a real
// SDK gap, but fixing it there would gate this app on an SDK release.
function kioskDisplayMode(): Plugin {
  return {
    name: 'chef-totem:kiosk-display-mode',
    apply: 'build',
    // writeBundle, not generateBundle: the SDK's appShellPwa emits the manifest
    // from a `generateBundle` hook declared `order: "post"`, so it always lands
    // after any generateBundle rewrite here. Patching the written file is the
    // one point that is unambiguously later.
    async writeBundle(options) {
      const { readFile, writeFile } = await import('node:fs/promises')
      const { resolve } = await import('node:path')
      const file = resolve(options.dir ?? 'dist', 'manifest.webmanifest')
      const manifest = JSON.parse(await readFile(file, 'utf8'))
      manifest.display = 'fullscreen'
      manifest.orientation = 'portrait'
      await writeFile(file, JSON.stringify(manifest, null, 2))
    },
  }
}

export default defineConfig(
  fayzVite({
    port: 5310,
    strictPort: true,
    plugins: [react(), kioskDisplayMode()],
    pwa: {
      name: 'Chef Totem',
      shortName: 'Totem',
      themeColor: '#0B0B0C',
      backgroundColor: '#0B0B0C',
    },
    bootSkeleton: { surface: 'none' },
  }),
)
