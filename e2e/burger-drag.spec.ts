import { expect, test, type Page } from '@playwright/test'

async function dragLayer(page: Page, id: string, direction: 'out' | 'in', cancel = false) {
  const item = page.getByTestId(`${direction === 'out' ? 'burger-hit' : 'burger-restore'}-${id}`)
  const box = (await item.boundingBox())!
  const scene = (await page.getByTestId('burger-drop-zone').boundingBox())!
  const x = box.x + box.width * .45, y = box.y + box.height * .6
  const to = direction === 'out' ? { x: scene.x - 90, y: scene.y + scene.height * .5 }
    : { x: scene.x + scene.width * .5, y: scene.y + scene.height * .5 }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] })
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1,
      x: x + (to.x - x) * step / 10, y: y + (to.y - y) * step / 10 }] })
  }
  await expect(page.getByTestId('burger-drag-ghost')).toBeVisible()
  await expect(page.getByTestId('burger-stage')).toHaveAttribute('data-drop-ready', 'true')
  await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('toque seleciona, retirar tem botão equivalente e recolocar restaura', async ({ page }) => {
  await page.goto('/?tenant=maxburger&burger-pilot')
  await expect(page.getByTestId('burger-hit-bacon')).toBeVisible()
  await page.waitForTimeout(800)
  // Ambient motion is intentional; send actual touch input to the current
  // screen position instead of waiting for the floating layer to stop moving.
  const bacon = (await page.getByTestId('burger-hit-bacon').boundingBox())!
  await page.touchscreen.tap(bacon.x + bacon.width / 2, bacon.y + bacon.height / 2)
  await expect(page.getByTestId('burger-selection')).toContainText('Bacon')
  await expect(page.getByTestId('burger-layer-bacon')).toBeVisible()
  await page.getByTestId('burger-remove-selected').tap()
  await expect(page.getByTestId('burger-layer-bacon')).toHaveCount(0)
  await expect(page.getByTestId('burger-pilot-bacon')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('burger-restore-bacon').tap()
  await expect(page.getByTestId('burger-layer-bacon')).toBeVisible()
  await expect(page.getByTestId('burger-pilot-bacon')).toHaveAttribute('aria-pressed', 'true')
})

test('drag out retira, drag in recoloca e cancelamento preserva o ingrediente', async ({ page }, testInfo) => {
  await page.goto('/?tenant=maxburger&burger-pilot')
  await expect(page.getByTestId('burger-hit-bacon')).toBeVisible()
  await page.waitForTimeout(800)
  await dragLayer(page, 'bacon', 'out', true)
  await expect(page.getByTestId('burger-layer-bacon')).toBeVisible()
  await expect(page.getByTestId('burger-drag-ghost')).toHaveCount(0)
  await dragLayer(page, 'bacon', 'out')
  await expect(page.getByTestId('burger-layer-bacon')).toHaveCount(0)
  await expect(page.getByTestId('burger-restore-bacon')).toBeVisible()
  await page.waitForTimeout(700)
  await page.getByTestId('burger-pilot-sheet').screenshot({ path: testInfo.outputPath('burger-bacon-removed.png') })
  await dragLayer(page, 'bacon', 'in')
  await expect(page.getByTestId('burger-layer-bacon')).toBeVisible()
  await expect(page.getByTestId('burger-restore-bacon')).toHaveCount(0)
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1)
})

test('montado não oferece retirada na cena e movimento reduzido continua editável', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?tenant=maxburger&burger-pilot')
  await page.getByTestId('burger-view-closed').tap()
  await expect(page.getByTestId('burger-hit-bacon')).toHaveCount(0)
  await page.getByTestId('burger-view-open').tap()
  await page.getByTestId('burger-hit-bacon').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('burger-selection')).toContainText('Bacon')
  await page.getByTestId('burger-remove-selected').click()
  await expect(page.getByTestId('burger-layer-bacon')).toHaveCount(0)
  await expect(page.locator('.burger-ambient')).toHaveCount(0)
})
