import { defineConfig } from '@playwright/test'

// ---------------------------------------------------------------------------
// The totem E2E runs at the real panel size: 1080x1920 portrait, touch on.
//
// What this suite CAN prove: the flow works, the data is right, and the pixels
// did not move since the last run. What it CANNOT prove: whether a control is
// within physical reach, whether the red survives the glare of a dining room,
// whether a thick finger lands on the right modifier chip. That is M9, on the
// actual 27" panel.
// ---------------------------------------------------------------------------

const PORT = 5310
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1080, height: 1920 },
    hasTouch: true,
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Locally this reuses whatever is already on :5310; on CI there is nothing
  // running, so Playwright starts (and owns) the dev server itself.
  webServer: {
    // The QA tenant's catalog is test debris (no categories, ingredients priced
    // at zero), so the suite runs against the demo menu. What is under test is
    // the SCREEN; the live provider is covered by its own contract test.
    command: 'npm run dev',
    env: { VITE_TOTEM_CATALOG: 'demo' },
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
})
