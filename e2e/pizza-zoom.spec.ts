import { expect, test, type Page } from '@playwright/test'

const scale = (page: Page, id = 'pizza-spin') => page.getByTestId(id).evaluate((element) =>
  new DOMMatrixReadOnly(getComputedStyle(element).transform).a)

async function openPizza(page: Page) {
  await page.goto('/?tenant=pizza-house')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('pizza-spin')).toBeVisible()
  await expect.poll(() => scale(page, 'pizza-size-scene')).toBe(1)
  await page.getByTestId('pizza-stage').scrollIntoViewIfNeeded()
}

// Chromium's real multitouch input: exercises capture, cancellation and browser zoom.
async function fingers(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  const box = (await page.getByTestId('pizza-spin').boundingBox())!
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  let distance = 100
  const points = () => [{ id: 1, x: x - distance / 2, y }, { id: 2, x: x + distance / 2, y }]
  return {
    async start(next = 100) {
      distance = next
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points() })
    },
    async move(next: number) {
      const from = distance
      for (let step = 1; step <= 8; step++) {
        distance = from + (next - from) * step / 8
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points() })
      }
    },
    async end(cancel = false) {
      await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
    },
    async liftFirst() {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: points().slice(0, 1) })
    },
  }
}

test('pinça aproxima, segura enquanto há dedos e retorna animada sem escolher metade', async ({ page }, testInfo) => {
  await openPizza(page)
  await page.getByTestId('pizza-flavor-ph-p-calabresa').tap()
  await page.getByTestId('mod-ph-m-meio-4queijos').tap()
  await page.getByTestId('pizza-stage').scrollIntoViewIfNeeded()
  const touch = await fingers(page)
  await touch.start()
  await touch.move(300)
  await expect.poll(() => scale(page)).toBeCloseTo(1.8, 2)
  await expect(page.getByTestId('pizza-spin')).toHaveAttribute('data-rotation-state', 'pinching')
  await touch.liftFirst()
  await expect(page.getByTestId('pizza-spin')).toHaveAttribute('data-rotation-state', 'dragging')
  await page.waitForTimeout(3300)
  expect(await scale(page)).toBeCloseTo(1.8, 2)
  await page.screenshot({ path: testInfo.outputPath('pizza-zoom.png'), fullPage: true })
  await touch.end()
  await expect(page.getByTestId('pizza-half-highlight')).toHaveAttribute('data-half', '1')
  await page.waitForTimeout(2400)
  expect(await scale(page)).toBeCloseTo(1.8, 2)
  await expect.poll(() => scale(page), { intervals: [30] }).toBeLessThan(1.7)
  expect(await scale(page)).toBeGreaterThan(1.01)
  // A new touch catches the return at its current frame instead of jumping.
  await touch.start()
  const caught = await scale(page)
  await page.waitForTimeout(850)
  expect(await scale(page)).toBeCloseTo(caught, 2)
  await touch.end()
  await expect.poll(() => scale(page)).toBe(1)
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1)
  await expect(page.getByTestId('checkout')).toBeDisabled()
})

test('afastamento tem limite, volta aproximando e cancelamento não prende a captura', async ({ page }) => {
  await openPizza(page)
  const touch = await fingers(page)
  await touch.start(220)
  await touch.move(60)
  await expect.poll(() => scale(page)).toBeCloseTo(.9, 2)
  await touch.end(true)
  await expect(page.getByTestId('pizza-spin')).not.toHaveAttribute('data-rotation-state', 'pinching')
  await page.waitForTimeout(2400)
  expect(await scale(page)).toBeCloseTo(.9, 2)
  await expect.poll(() => scale(page), { intervals: [30] }).toBeGreaterThan(.92)
  expect(await scale(page)).toBeLessThan(1)
  await expect.poll(() => scale(page)).toBe(1)
  await touch.start()
  await touch.move(150)
  await touch.end()
  await expect.poll(() => scale(page)).toBeCloseTo(1.5, 2)
  await expect(page.getByTestId('pizza-half-highlight')).toHaveAttribute('data-half', '0')
})

test('zoom é relativo ao tamanho, movimento reduzido permite pinça e reabrir limpa o zoom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPizza(page)
  await page.getByTestId('mod-ph-m-grande').tap()
  await expect.poll(() => scale(page, 'pizza-size-scene')).toBeCloseTo(1.3, 2)
  await page.getByTestId('pizza-stage').scrollIntoViewIfNeeded()
  const touch = await fingers(page)
  await touch.start()
  await touch.move(150)
  await touch.end()
  await expect.poll(() => scale(page)).toBeCloseTo(1.5, 2)
  await expect.poll(() => scale(page)).toBe(1)
  expect(await scale(page, 'pizza-size-scene')).toBeCloseTo(1.3, 2)
  await touch.start()
  await touch.move(150)
  await touch.end()
  await page.getByTestId('mod-ph-m-individual').tap()
  await expect.poll(() => scale(page)).toBe(1)
  expect(await scale(page, 'pizza-size-food')).toBeCloseTo(25 / 30, 2)
  await page.getByTestId('pizza-stage').scrollIntoViewIfNeeded()
  const again = await fingers(page)
  await again.start()
  await again.move(150)
  await again.end()
  await page.keyboard.press('Escape')
  await page.getByTestId('product-ph-p-calabresa').tap()
  await expect.poll(() => scale(page)).toBe(1)
})

test('os cinco sabores usam a mesma imagem inteira no menu e na montagem', async ({ page }, testInfo) => {
  await openPizza(page)
  await page.keyboard.press('Escape')
  for (const flavor of ['calabresa', 'margherita', 'pepperoni', 'quatro-queijos', 'diavola']) {
    const id = `ph-p-${flavor}`
    const image = page.getByTestId(`img-${id}`)
    const source = `/demo/pizza-house/pizza/${flavor}.webp`
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveAttribute('src', source)
    await expect(image).toHaveCSS('object-fit', 'contain')
    await expect(image.locator('..')).toHaveCSS('background-color', 'rgb(41, 40, 39)')
    await expect.poll(() => image.evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0)).toBe(true)
    await page.getByTestId(`product-${id}`).tap()
    await expect(page.getByTestId('pizza-stage').locator('.pizza-flavor img')).toHaveAttribute('src', source)
    await page.keyboard.press('Escape')
  }
  await page.getByTestId('product-ph-p-margherita').scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('pizza-menu.png'), fullPage: true })
})
