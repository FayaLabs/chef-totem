import { expect, test, type Page } from '@playwright/test'

async function enter(page: Page) {
  await page.goto('/?tenant=maxburger')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('burger-preview')).toBeVisible()
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-australiano').tap()
  await page.getByTestId('mod-mb-m-ponto').tap()
}

test('prévia fixa, controles laterais e escolhas roláveis sem sobreposição', async ({ page }, info) => {
  await enter(page)
  const preview = page.getByTestId('burger-preview')
  const body = page.getByTestId('product-sheet').getByTestId('sheet-body')
  const controls = page.getByTestId('burger-preview-controls')
  const before = (await preview.boundingBox())!
  const stage = (await page.getByTestId('burger-stage').boundingBox())!
  const controlBounds = (await controls.boundingBox())!
  await page.waitForTimeout(750)
  const bun = (await page.getByTestId('burger-hit-top').boundingBox())!
  const handle = (await page.getByTestId('sheet-handle').boundingBox())!
  expect(bun.y).toBeGreaterThan(handle.y + handle.height)
  expect(controlBounds.x).toBeGreaterThanOrEqual(stage.x + stage.width - 1)
  for (const id of ['burger-photo-toggle', 'burger-layers-toggle', 'burger-stack-toggle']) {
    const box = (await page.getByTestId(id).boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(stage.y)
    expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height)
    expect(box.height).toBeGreaterThanOrEqual(87)
  }
  await body.hover()
  const initialScroll = await body.evaluate((e) => e.scrollTop)
  await page.mouse.wheel(0, 1100)
  await expect.poll(() => body.evaluate((e) => e.scrollTop)).toBeGreaterThan(initialScroll + 100)
  const after = (await preview.boundingBox())!
  expect(after.y).toBeCloseTo(before.y, 0)
  expect(after.height).toBeCloseTo(before.height, 0)
  expect((await body.boundingBox())!.y).toBeGreaterThanOrEqual(after.y + after.height - 1)
  await page.getByTestId('mod-mb-m-ovo').tap()
  await expect(page.getByTestId('burger-layer-extra-mb-m-ovo')).toBeVisible()
  await expect(page.getByTestId('sheet-total')).toHaveText(/42,00/)
  await page.waitForTimeout(750)
  await page.screenshot({ path: info.outputPath('fixed-preview-extras.png') })
  const scroll = await body.evaluate((e) => e.scrollTop)
  await page.getByTestId('burger-photo-toggle').tap()
  await expect(page.locator('.burger-photo-stage [data-testid="burger-still"]')).toHaveAttribute('data-ready', 'true')
  expect(await body.evaluate((e) => e.scrollTop)).toBeCloseTo(scroll, 0)
  expect((await preview.boundingBox())!.height).toBeCloseTo(before.height, 0)
  await page.getByTestId('burger-layers-toggle').tap()
  await page.getByTestId('burger-stack-toggle').tap()
  await expect(page.getByTestId('burger-stage')).toHaveAttribute('data-open', 'false')
  expect(await body.evaluate((e) => e.scrollTop)).toBeCloseTo(scroll, 0)
})

test('trocar pão na cena alcança as opções e o puxador fecha mesmo com a lista rolada', async ({ page }) => {
  await enter(page)
  await page.getByTestId('mod-mb-m-sem-cebola').tap()
  await page.getByTestId('burger-hit-top').focus()
  await page.keyboard.press('Enter')
  await page.getByTestId('burger-remove-selected').tap()
  await expect(page.getByTestId('mod-mb-m-brioche')).toBeFocused()
  await page.getByTestId('mod-mb-m-sem-gluten').tap()
  await expect(page.getByTestId('burger-layer-top')).toHaveAttribute('data-asset', 'gluten-free-top')
  const body = page.getByTestId('product-sheet').getByTestId('sheet-body')
  await page.getByTestId('mod-mb-m-ovo').tap()
  expect(await body.evaluate((e) => e.scrollTop)).toBeGreaterThan(0)
  const handle = (await page.getByTestId('sheet-handle').boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 190, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
  await expect(page.getByTestId('open-cart')).toBeDisabled()
})

test('rolagem por toque e modo de alcance mantêm prévia e ação acessíveis', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page)
  await page.keyboard.press('Escape')
  await page.getByTestId('reach-toggle').tap()
  await page.getByTestId('product-mb-p-cheddar-bacon').tap()
  const preview = page.getByTestId('burger-preview')
  const body = page.getByTestId('product-sheet').getByTestId('sheet-body')
  const before = (await preview.boundingBox())!
  const bounds = (await body.boundingBox())!
  expect(bounds.height).toBeGreaterThan(300)
  const cdp = await page.context().newCDPSession(page)
  const x = bounds.x + bounds.width * .6, y = bounds.y + bounds.height * .85
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] })
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1,
    x, y: y - bounds.height * .6 * i / 12 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await expect.poll(() => body.evaluate((e) => e.scrollTop)).toBeGreaterThan(100)
  expect((await preview.boundingBox())!.y).toBeCloseTo(before.y, 0)
  await expect(page.getByTestId('burger-stack-toggle')).toBeVisible()
  await expect(page.getByTestId('add-to-order')).toBeInViewport()
  await expect(page.locator('.burger-ambient')).toHaveCount(0)
})
