import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// The waiter's brain is plain TypeScript over zustand stores — no DOM, no
// audio, no network. It runs here in milliseconds, which is the whole reason
// brain and transport are separate files.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // THE SUITE'S ENVIRONMENT BELONGS TO THE REPOSITORY, NOT TO THE MACHINE.
    //
    // Vite loads `.env` and `.env.local` in here too, and the `.env.local` of
    // whoever is working on the panel points at the house they are looking at —
    // today MaxBurger, in demo mode. Twelve tests failed for that reason and no
    // other: `demo-mode` asserts that with no choice made the panel is live,
    // and `waiter-tools` looks for the Pepperoni, which belongs to Pizza House.
    // None of it was broken code; it was the suite describing one panel and the
    // machine describing another.
    //
    // Pinning both variables here makes the suite say the same thing in any
    // checkout. Running against another house is still one variable on the
    // command line away — the shell keeps winning.
    env: {
      VITE_TOTEM_CATALOG: '',
      VITE_TOTEM_DEMO_TENANT: 'pizza-house',
    },
  },
})
