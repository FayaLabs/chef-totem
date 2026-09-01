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
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
