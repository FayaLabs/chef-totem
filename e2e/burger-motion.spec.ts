import { expect, test, type Page } from '@playwright/test'

async function enter(page: Page) {
  await page.goto('/?tenant=maxburger')
  for (const id of ['attract', 'mode-dine-in', 'identify-skip']) await page.getByTestId(id).tap()
  await expect(page.locator('.burger-photo-stage [data-testid="burger-still"]')).toHaveAttribute('data-ready', 'true')
}

test('pão e queijo abrem, renovam o tempo e fecham sem mudar o pedido', async ({ page }, info) => {
  await enter(page)
  const stage = page.getByTestId('burger-stage'), builder = page.getByTestId('burger-builder')
  await expect(stage).toHaveAttribute('data-open', 'false')
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-australiano').tap()
  await expect(stage).toHaveAttribute('data-open', 'true')
  await page.waitForTimeout(1800)
  await page.getByTestId('mod-mb-m-cheddar').tap()
  await expect(page.getByTestId('burger-layer-extra-mb-m-cheddar')).toBeVisible()
  await page.waitForTimeout(1200)
  await expect(stage).toHaveAttribute('data-open', 'true')
  const shadow = stage.getByTestId('burger-shadow')
  await expect(shadow).toBeVisible()
  await expect(shadow).toHaveCSS('pointer-events', 'none')
  await page.screenshot({ path: info.outputPath('burger-shadow-open.png') })
  await expect(stage).toHaveAttribute('data-open', 'false', { timeout: 4000 })
  await expect(builder).toHaveAttribute('data-view', 'photo')
  await page.screenshot({ path: info.outputPath('burger-shadow-closed.png') })
  await page.getByTestId('mod-mb-m-ponto').tap()
  await expect(builder).toHaveAttribute('data-view', 'photo')
  await expect(page.getByTestId('sheet-total')).toContainText('43,00')
  await expect(page.getByTestId('open-cart')).toBeDisabled()
  // A held gesture must never close beneath the customer's finger.
  await page.getByTestId('burger-layers-toggle').tap()
  await page.waitForTimeout(700)
  const hit = (await page.getByTestId('burger-hit-extra-mb-m-cheddar').boundingBox())!
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(2900)
  await expect(stage).toHaveAttribute('data-open', 'true')
  await page.mouse.up()
  await expect(stage).toHaveAttribute('data-open', 'false', { timeout: 4000 })
})

test('adicionar fecha, voa para o carrinho e registra uma única linha', async ({ page }) => {
  await enter(page)
  for (const id of ['burger-recipe-mb-p-cheddar-bacon', 'mod-mb-m-australiano', 'mod-mb-m-ponto', 'burger-layers-toggle']) {
    await page.getByTestId(id).tap()
  }
  await page.waitForTimeout(700)
  await page.getByTestId('add-to-order').tap()
  const arrival = page.getByTestId('burger-cart-arrival')
  await expect(arrival).toBeVisible()
  await expect(arrival).toHaveAttribute('data-closing', 'true')
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
  await expect(arrival).toHaveCount(0, { timeout: 3000 })
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-line-mb-p-cheddar-bacon')).toHaveCount(1)
  await expect(page.getByTestId('cart-total')).toContainText('39,00')
})

test('movimento reduzido não deixa animação atrasada após a compra', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page)
  for (const id of ['burger-recipe-mb-p-cheddar-bacon', 'mod-mb-m-brioche', 'mod-mb-m-ponto', 'add-to-order']) {
    await page.getByTestId(id).tap()
  }
  await expect(page.getByTestId('burger-cart-arrival')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.getByTestId('burger-cart-arrival')).toHaveCount(0)
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-total')).toContainText('36,00')
})
