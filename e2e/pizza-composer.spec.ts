import { expect, test, type Page } from '@playwright/test'
import { dismissPizzaIntro } from './pizza-helpers'

async function menu(page: Page, tenant = 'pizza-house', keepIntro = false) {
  await page.goto(`/?tenant=${tenant}`)
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('menu-grid')).toBeVisible()
  if (tenant === 'pizza-house' && !keepIntro) await dismissPizzaIntro(page)
}
const angle = (page: Page) => page.getByTestId('pizza-board').evaluate((e) => {
  const m = new DOMMatrixReadOnly(getComputedStyle(e).transform)
  return Math.atan2(m.b, m.a) * 180 / Math.PI
})
const delta = (a: number, b: number) => ((b - a + 540) % 360) - 180

test('identificação abre a montagem primeiro; adicionar libera o cardápio e uma nova visita reabre', async ({ page }) => {
  await menu(page, 'pizza-house', true)
  await expect(page.getByTestId('pizza-composer')).toBeVisible()
  await expect(page.getByTestId('pizza-half-0')).toContainText('Adicionar sabor')
  await expect(page.getByTestId('pizza-stage').locator('.pizza-flavor img')).toHaveCount(0)
  await expect(page.getByTestId('add-to-order')).toContainText('primeiro sabor')
  await expect(page.locator('.pizza-choice[aria-pressed="true"]')).toHaveCount(0)
  await page.getByTestId('pizza-flavor-ph-p-calabresa').tap()
  await page.getByTestId('mod-ph-m-meio-4queijos').tap()
  await page.getByTestId('mod-ph-m-media').tap()
  await page.getByTestId('add-to-order').tap()
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
  await page.getByTestId('cat-ph-c-bebidas').tap()
  await page.getByTestId('product-ph-p-refri').tap()
  await expect(page.getByTestId('pizza-composer')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByTestId('reset').tap()
  await page.getByTestId('cancel-discard').tap()
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('pizza-composer')).toBeVisible()
  await expect(page.getByTestId('pizza-half-1')).toContainText('Adicionar sabor')
})

test('individual encolhe na tábua, média preenche e grande amplia o conjunto com transição', async ({ page }, testInfo) => {
  await menu(page, 'pizza-house', true)
  await page.getByTestId('pizza-flavor-ph-p-calabresa').tap()
  await page.getByTestId('mod-ph-m-meio-4queijos').tap()
  const scales = () => page.evaluate(() => {
    const get = (testId: string) => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!).transform).a
    return { food: get('pizza-size-food'), scene: get('pizza-size-scene') }
  })
  await page.getByTestId('mod-ph-m-individual').tap()
  await expect.poll(async () => (await scales()).food).toBeCloseTo(25 / 30, 2)
  expect((await scales()).scene).toBeCloseTo(1, 2)
  await page.getByTestId('mod-ph-m-media').tap()
  const interpolated = await page.evaluate(async () => {
    const values: number[] = []
    for (let i = 0; i < 6; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const e = document.querySelector('[data-testid="pizza-size-food"]')!
      values.push(new DOMMatrixReadOnly(getComputedStyle(e).transform).a)
    }
    return values
  })
  expect(new Set(interpolated.map((n) => n.toFixed(4))).size).toBeGreaterThan(1)
  await expect.poll(async () => (await scales()).food).toBeCloseTo(1, 2)
  expect((await scales()).scene).toBeCloseTo(1, 2)
  await page.getByTestId('mod-ph-m-grande').tap()
  await expect.poll(async () => (await scales()).scene).toBeCloseTo(1.3, 2)
  expect((await scales()).food).toBeCloseTo(1, 2)
  await expect(page.getByTestId('pizza-stage')).toHaveAttribute('data-diameter', '35')
  await page.getByTestId('pizza-stage').scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('pizza-grande.png'), fullPage: true })
  // Shrink back without re-creating or resetting the rotating board.
  const previousAngle = await angle(page)
  await page.getByTestId('mod-ph-m-individual').tap()
  await expect.poll(async () => (await scales()).food).toBeCloseTo(25 / 30, 2)
  await expect.poll(async () => (await scales()).scene).toBeCloseTo(1, 2)
  expect(delta(previousAngle, await angle(page))).toBeGreaterThan(0)
})

test('mesmo cardápio, montagem automática, seleção direta e carrinho fiel', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await menu(page)
  await expect(page.getByTestId('category-rail')).toBeVisible()
  await expect(page.getByTestId('pizza-stage')).toHaveCount(0)
  await page.getByTestId('product-ph-p-calabresa').tap()
  await expect(page.getByTestId('pizza-mode-half')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('pizza-half-highlight')).toHaveAttribute('data-half', '0')
  await expect(page.getByRole('button', { name: /girar para|pausar efeitos/i })).toHaveCount(0)
  await expect(page.getByTestId('pizza-stage')).not.toContainText(/toque|arraste/i)
  await page.getByTestId('pizza-flavor-ph-p-quatro-queijos').tap()
  await expect(page.getByTestId('pizza-half-1')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('pizza-half-0')).toContainText('Quatro queijos')
  await page.getByTestId('mod-ph-m-meio-calabresa').tap()
  await expect(page.getByTestId('pizza-half-1')).toContainText('Calabresa')
  // Tap the rotating pizza itself, not the below-image fallback control.
  await page.getByTestId('pizza-spin').scrollIntoViewIfNeeded()
  const hit = await page.getByTestId('pizza-spin').boundingBox()
  const a = await angle(page) * Math.PI / 180
  await page.touchscreen.tap(hit!.x + hit!.width / 2 - Math.cos(a) * hit!.width * .22,
    hit!.y + hit!.height / 2 - Math.sin(a) * hit!.height * .22)
  await expect(page.getByTestId('pizza-half-0')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('pizza-flavor-ph-p-margherita').tap()
  await expect(page.getByTestId('pizza-half-1')).toContainText('Calabresa')
  await page.getByTestId('mod-ph-m-media').tap()
  await expect(page.getByTestId('sheet-total')).toHaveText('R$ 67,00')
  await page.getByTestId('add-to-order').tap()
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-sheet')).toContainText('½ Margherita + ½ Calabresa')
  await expect(page.getByTestId('cart-total')).toHaveText('R$ 67,00')
  await expect(page.getByTestId('cart-sheet').getByRole('img', { name: 'Pizza: metade Margherita, metade Calabresa' })).toBeVisible()
  await page.getByTestId('cart-edit-ph-p-margherita').tap()
  await page.getByTestId('pizza-mode-whole').tap()
  await expect(page.getByTestId('sheet-total')).toHaveText('R$ 63,00')
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await expect(page.locator('[data-testid^="cart-line-"]')).toHaveCount(1)
  await expect(page.getByTestId('cart-total')).toHaveText('R$ 63,00')
  await page.getByTestId('to-payment').tap()
  await expect(page.getByTestId('screen-payment')).toBeVisible()
  expect(errors).toEqual([])
})

test('gira continuamente: trocar sabores desacelera, nunca congela, e depois retoma', async ({ page }) => {
  await menu(page)
  await page.getByTestId('product-ph-p-calabresa').tap()
  await expect(page.getByTestId('pizza-spin')).toHaveAttribute('data-rotation-state', 'idle')
  const start = await angle(page)
  await page.waitForTimeout(600)
  expect(delta(start, await angle(page))).toBeGreaterThan(2)
  await page.getByTestId('pizza-flavor-ph-p-quatro-queijos').tap()
  const after = await angle(page)
  await page.waitForTimeout(600)
  expect(delta(after, await angle(page))).toBeGreaterThan(.5)
  await page.waitForTimeout(900)
  const slow = await angle(page)
  await page.waitForTimeout(500)
  const slowDelta = delta(slow, await angle(page))
  expect(slowDelta).toBeGreaterThan(.4)
  expect(slowDelta).toBeLessThan(2.5)
  await page.waitForTimeout(2300)
  const normal = await angle(page)
  await page.waitForTimeout(500)
  expect(delta(normal, await angle(page))).toBeGreaterThan(slowDelta * 1.4)
})

test('arrastar gira sem escolher, perder captura não deixa o gesto preso', async ({ page }) => {
  await menu(page)
  await page.getByTestId('product-ph-p-calabresa').tap()
  const surface = page.getByTestId('pizza-spin')
  const box = (await surface.boundingBox())!
  const initial = await angle(page)
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .8, { steps: 12 })
  await page.mouse.up()
  expect(delta(initial, await angle(page))).toBeGreaterThan(50)
  await expect(page.getByTestId('pizza-half-highlight')).toHaveAttribute('data-half', '0')
  await expect(page.getByTestId('checkout')).toBeDisabled()
  await surface.dispatchEvent('pointercancel')
  await expect(surface).not.toHaveAttribute('data-rotation-state', 'dragging')
})

test('composição centralizada, imagens carregadas e alvo de toque no tamanho do painel', async ({ page }, testInfo) => {
  await menu(page)
  await page.getByTestId('product-ph-p-calabresa').tap()
  await page.getByTestId('pizza-flavor-ph-p-calabresa').tap()
  await page.getByTestId('mod-ph-m-meio-4queijos').tap()
  await page.waitForTimeout(350)
  await page.getByTestId('pizza-spin').scrollIntoViewIfNeeded()
  const stage = (await page.getByTestId('pizza-stage').boundingBox())!
  const pizza = (await page.getByTestId('pizza-spin').boundingBox())!
  expect(Math.abs((stage.x + stage.width / 2) - (pizza.x + pizza.width / 2))).toBeLessThan(1)
  expect(Math.abs((stage.y + stage.height / 2) - (pizza.y + pizza.height / 2))).toBeLessThan(1)
  const images = await page.getByTestId('pizza-composer').locator('img').evaluateAll((items) => items.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))
  expect(images).toBe(true)
  for (const selector of ['.pizza-choice', '.pizza-selected-flavor']) {
    const heights = await page.locator(selector).evaluateAll((items) => items.map((e) => e.getBoundingClientRect().height))
    expect(heights.every((height) => height >= 88)).toBe(true)
  }
  await page.getByTestId('pizza-stage').scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('pizza-composer.png'), fullPage: true })
})

test('movimento reduzido mantém montagem; bebidas e outro tenant usam detalhe normal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await menu(page)
  await page.getByTestId('product-ph-p-calabresa').tap()
  const start = await angle(page)
  await page.waitForTimeout(400)
  expect(await angle(page)).toBe(start)
  await page.getByTestId('pizza-flavor-ph-p-quatro-queijos').tap()
  await expect(page.getByTestId('pizza-half-1')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('sheet-scrim').tap({ position: { x: 40, y: 150 } })
  await page.getByTestId('cat-ph-c-bebidas').tap()
  await page.getByTestId('product-ph-p-refri').tap()
  await expect(page.getByTestId('pizza-composer')).toHaveCount(0)
  await expect(page.getByTestId('sheet-image')).toBeVisible()
  await page.getByTestId('add-to-order').tap()
  await expect(page.getByTestId('checkout')).toContainText('R$ 8,00')
  await menu(page, 'cafe-sabor')
  await page.getByTestId('product-cs-p-cappuccino').tap()
  await expect(page.getByTestId('pizza-composer')).toHaveCount(0)
  await expect(page.getByTestId('sheet-image')).toBeVisible()
})
