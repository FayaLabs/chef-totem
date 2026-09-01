import { expect, test } from '@playwright/test'

// M2 — attract to menu. The tap count is the acceptance criterion, not a nice
// extra: every tap between the customer and the food is a chance to give up
// and join the till queue.
test.describe('M2 · atrair, modo e identificação', () => {
  test('do repouso ao cardápio em 3 toques, sem se identificar', async ({ page }) => {
    await page.goto('/')

    let taps = 0
    await page.getByTestId('attract').tap()
    taps++
    await expect(page.getByTestId('screen-mode')).toBeVisible()

    await page.getByTestId('mode-dine-in').tap()
    taps++
    await expect(page.getByTestId('screen-identify')).toBeVisible()

    await page.getByTestId('identify-skip').tap()
    taps++
    await expect(page.getByTestId('screen-menu')).toBeVisible()

    expect(taps, 'mais de 3 toques até o cardápio').toBeLessThanOrEqual(3)
  })

  test('o painel inteiro é o botão do attract', async ({ page }) => {
    // Nobody walking past a kiosk hunts for a target — they touch the screen.
    // A start button that only works inside one rectangle teaches the customer
    // that the panel is broken.
    await page.goto('/')
    const box = (await page.getByTestId('attract').boundingBox())!
    expect(box.width).toBeCloseTo(1080, 0)
    expect(box.height).toBeCloseTo(1920, 0)
  })

  test('pular tem o mesmo peso visual que confirmar', async ({ page }) => {
    // Mandatory identification is the fastest way to send a customer back to
    // the till queue. The skip is a full-size button, not a grey link.
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-takeaway').tap()

    const skip = (await page.getByTestId('identify-skip').boundingBox())!
    const confirm = (await page.getByTestId('identify-confirm').boundingBox())!
    expect(skip.width).toBeCloseTo(confirm.width, 0)
    expect(skip.height).toBeCloseTo(confirm.height, 0)
    expect(skip.height).toBeGreaterThanOrEqual(88)
  })

  test('o confirmar diz o que falta em vez de só apagar', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()

    const confirm = page.getByTestId('identify-confirm')
    await expect(confirm).toBeDisabled()
    await expect(confirm).toHaveText(/faltam 11/i)

    for (const digit of '1198765432') await page.getByTestId(`key-${digit}`).tap()
    await expect(confirm).toHaveText(/falta[m]? 1/i)

    await page.getByTestId('key-1').tap()
    await expect(confirm).toBeEnabled()
    await expect(confirm).toHaveText(/continuar/i)
  })

  test('o telefone é formatado enquanto se digita', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    for (const digit of '11987654321') await page.getByTestId(`key-${digit}`).tap()
    await expect(page.getByTestId('identify-value')).toHaveText('(11) 98765-4321')
  })

  test('trocar telefone por CPF limpa o que foi digitado', async ({ page }) => {
    // Otherwise eight digits of a phone silently become the first eight of a
    // CPF, and the customer confirms a document that is not theirs.
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    for (const digit of '11987') await page.getByTestId(`key-${digit}`).tap()

    await page.getByTestId('kind-document').tap()
    await expect(page.getByTestId('identify-value')).toHaveText(/só os números/i)
  })

  test('a senha da fila aparece assim que a sessão começa', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await expect(page.getByTestId('screen-mode')).toContainText(/senha #\d{3}/i)
  })
})

test('a mídia do attract é pintada, não coberta pelo fundo do palco', async ({ page }) => {
  // Regression: MediaBackdrop was `-z-10`, which put it BEHIND the stage's own
  // background — the panel rendered pure black and the scrim had nothing to sit
  // on, so no amount of staring at contrast would have found it.
  await page.goto('/')
  // Wait for the decode: without this the probe races the network and reports
  // "sem imagem" for a backdrop that is perfectly fine.
  const image = page.locator('[data-testid="media-backdrop"] img')
  await expect(image).toBeVisible()
  await image.evaluate((img: HTMLImageElement) => (img.complete ? Promise.resolve() : img.decode()))

  const painted = await page.evaluate(() => {
    const img = document.querySelector('[data-testid="media-backdrop"] img') as HTMLImageElement | null
    if (!img || !img.complete || img.naturalWidth === 0) return 'sem imagem'
    // Probe high on the panel, where no content sits — the centre is the
    // brand wordmark, which is SUPPOSED to be on top.
    const rect = img.getBoundingClientRect()
    const top = document.elementFromPoint(rect.width / 2, rect.top + rect.height * 0.12)
    // The scrim sits on top of the image by design; the stage must not.
    return top?.closest('[data-testid="media-backdrop"]') ? 'ok' : 'coberta'
  })
  expect(painted).toBe('ok')
})
