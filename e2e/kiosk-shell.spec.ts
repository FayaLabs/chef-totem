import { expect, test } from '@playwright/test'

// M0 — the shell. Proves the app boots at panel size, the state machine walks
// forward and resets, and the browser affordances a customer could fall into
// are gone.
test.describe('M0 · casca de quiosque', () => {
  test('abre no attract em 1080x1920', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('attract')).toBeVisible()

    const stage = page.locator('[data-totem-stage]')
    const box = await stage.boundingBox()
    expect(box).not.toBeNull()
    // The stage keeps 9:16 and fills the panel exactly.
    expect(box!.width).toBeCloseTo(1080, 0)
    expect(box!.height).toBeCloseTo(1920, 0)
  })

  test('toque avança a máquina de estados e o reset volta ao attract', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await expect(page.getByTestId('screen-mode')).toBeVisible()

    await page.getByTestId('mode-dine-in').tap()
    await page.getByTestId('identify-skip').tap()
    await expect(page.getByTestId('screen-menu')).toBeVisible()

    // `reset` is the single door out of a visit — the idle timeout (M7), the
    // cancel button and the receipt countdown all go through it.
    await page.getByTestId('reset').tap()
    await expect(page.getByTestId('attract')).toBeVisible()
  })

  test('não seleciona texto nem rola além do conteúdo', async ({ page }) => {
    await page.goto('/')
    const body = page.locator('body')
    await expect(body).toHaveCSS('user-select', 'none')
    await expect(body).toHaveCSS('overscroll-behavior-y', 'none')
    await expect(body).toHaveCSS('touch-action', 'manipulation')
  })

  test('dois toques rápidos em sequência valem os dois', async ({ page }) => {
    // Regression: a double-tap-zoom guard in JS swallowed any second tap inside
    // 300ms, so tapping two modifier chips in a row lost the second one.
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await expect(page.getByTestId('screen-identify')).toBeVisible()
  })

  test('o viewport não trava o zoom do sistema', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    // Blocking zoom in the meta tag would take it away from a low-vision
    // customer too; the gesture handlers do it instead.
    expect(content).not.toContain('user-scalable=no')
  })
})

// The build artefacts, asserted from the emitted files rather than the browser:
// a service worker the panel can boot from with no network, and a manifest that
// installs fullscreen and portrait.
test.describe('M0 · PWA de quiosque', () => {
  test('o build emite sw.js e um manifesto fullscreen/portrait', async () => {
    const { existsSync, readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const dist = resolve(process.cwd(), 'dist')

    test.skip(!existsSync(dist), 'rode `npm run build` antes')

    expect(existsSync(resolve(dist, 'sw.js'))).toBe(true)
    const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.webmanifest'), 'utf8'))
    expect(manifest.display).toBe('fullscreen')
    expect(manifest.orientation).toBe('portrait')
  })
})
