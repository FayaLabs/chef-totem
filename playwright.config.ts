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

const PORT = Number(process.env.TOTEM_E2E_PORT ?? 5310)
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
    // A casa em que a suíte roda, semeada no armazenamento em vez de vir do
    // `.env` de quem executa.
    //
    // O `webServer` abaixo pede `VITE_TOTEM_CATALOG=demo`, mas com
    // `reuseExistingServer` ele pega o `npm run dev` que já estava aberto — e
    // esse está no cardápio AO VIVO, porque é nele que se trabalha. O
    // resultado era uma suíte que passava ou falhava conforme o que a pessoa
    // tinha na porta 5310, o que é o oposto de um teste.
    //
    // A semente usa a MESMA chave do seletor escondido (ver demo/mode.ts), e
    // `?tenant=` continua ganhando dela: um teste que precisa de outra casa
    // pede pela URL, como o de troca de tenant faz.
    storageState: {
      cookies: [],
      origins: [
        { origin: BASE_URL, localStorage: [{ name: 'totem.demo.selection', value: 'pizza-house' }] },
      ],
    },
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
    command: `npm run dev -- --port ${PORT}`,
    // `pool` aqui é uma TRAVA, não uma preferência: com o backend do cluster
    // ligado no `.env` da máquina, um `pay-now` de teste vira uma venda de
    // verdade — comanda, pagamento e fatura num tenant real. A suíte roda no
    // cardápio de demonstração, e o pedido dela tem de morrer no navegador.
    //
    // Cuidado com `reuseExistingServer`: um `npm run dev` já aberto mantém o
    // `.env` de quem o abriu. Quando a suíte for gravar em algum lugar, é esse
    // servidor que decide onde.
    env: { VITE_TOTEM_CATALOG: 'demo', VITE_TOTEM_ORDER_BACKEND: 'pool' },
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
})
