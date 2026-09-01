import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// The waiter's brain is plain TypeScript over zustand stores — no DOM, no
// audio, no network. It runs here in milliseconds, which is the whole reason
// brain and transport are separate files.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
})
