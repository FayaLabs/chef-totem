import { expect, test, type Page } from '@playwright/test'

async function enter(page: Page) {
  await page.goto('/?tenant=maxburger')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('burger-builder')).toBeVisible()
}
async function ready(page: Page) {
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-australiano').tap()
  await page.getByTestId('mod-mb-m-ponto').tap()
  await expect(page.getByTestId('sheet-total')).toHaveText(/39,00/)
}

test('cards dos burgers têm fundo escuro só na foto e preservam os preços', async ({ page }, info) => {
  await enter(page)
  await page.keyboard.press('Escape')
  for (const [id, price] of [['classico', '29,00'], ['cheddar-bacon', '36,00'], ['smash-duplo', '39,00'], ['frango', '32,00'], ['veggie', '31,00']]) {
    const card = page.getByTestId(`product-mb-p-${id}`)
    await card.scrollIntoViewIfNeeded()
    const still = card.getByTestId('burger-still')
    await expect(still).toHaveAttribute('data-ready', 'true')
    await expect(still.locator('..')).toHaveCSS('background-color', 'rgb(41, 40, 39)')
    await expect(card).toContainText(price)
    await expect(card.locator(':scope > div').nth(1)).not.toHaveCSS('background-color', 'rgb(41, 40, 39)')
  }
  await expect(page.getByTestId('product-mb-p-veggie')).toBeDisabled()
  await page.getByTestId('product-mb-p-classico').scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath('burger-menu-dark.png') })
})

async function drag(page: Page, id: string, restore = false) {
  await page.getByTestId('burger-layers-toggle').tap()
  await page.waitForTimeout(750)
  const element = page.getByTestId(`${restore ? 'burger-restore' : 'burger-hit'}-${id}`)
  const box = (await element.boundingBox())!, scene = (await page.getByTestId('burger-drop-zone').boundingBox())!
  const x = box.x + box.width * .35, y = box.y + box.height * .65
  const target = { x: restore ? scene.x + scene.width * .5 : scene.x - 90, y: scene.y + scene.height * .5 }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] })
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1,
    x: x + (target.x - x) * i / 12, y: y + (target.y - y) * i / 12 }] })
  await expect(page.getByTestId('burger-drag-ghost')).toBeVisible()
  await expect(page.getByTestId('burger-stage')).toHaveAttribute('data-drop-ready', 'true')
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('intro, seleção explícita, carrinho, reedição e retorno ao menu', async ({ page }) => {
  await enter(page)
  await expect(page.getByTestId('add-to-order')).toContainText('seu burger')
  await expect(page.locator('.burger-recipe-list [aria-pressed="true"]')).toHaveCount(0)
  await ready(page)
  await page.getByTestId('mod-mb-m-sem-cebola').tap()
  await page.getByTestId('add-to-order').tap()
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
  await page.getByTestId('open-cart').tap()
  const line = page.getByTestId('cart-line-mb-p-cheddar-bacon')
  await expect(line).toContainText('Australiano')
  await expect(line).toContainText('Sem cebola crispy')
  await expect(page.getByTestId('cart-total')).toHaveText(/39,00/)
  await page.getByTestId('cart-edit-mb-p-cheddar-bacon').tap()
  await expect(page.getByTestId('mod-mb-m-australiano')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('mod-mb-m-ovo').tap()
  await page.keyboard.press('Escape')
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-total')).toHaveText(/39,00/)
  await page.getByTestId('cart-edit-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-ovo').tap()
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await expect(line).toHaveCount(1)
  await expect(page.getByTestId('cart-total')).toHaveText(/42,00/)
  await expect(line).toContainText('Ovo')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('burger-builder')).toHaveCount(0)
  await page.getByTestId('reset').tap()
  await page.getByTestId('cancel-discard').tap()
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('add-to-order')).toContainText('seu burger')
})

test('Foto e Montagem preservam pão, ponto e preço; os dois lados do pão mudam juntos', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await enter(page); await ready(page)
  for (const [id, asset, price] of [['brioche', 'brioche', '36,00'], ['sem-gluten', 'gluten-free', '41,00'], ['australiano', 'australian', '39,00']]) {
    await page.getByTestId(`mod-mb-m-${id}`).tap()
    await expect(page.getByTestId('burger-layer-top')).toHaveAttribute('data-asset', `${asset}-top`)
    await expect(page.getByTestId('burger-layer-bottom')).toHaveAttribute('data-asset', `${asset}-bottom`)
    await expect(page.getByTestId('sheet-total')).toHaveText(new RegExp(price))
    await page.getByTestId('burger-photo-toggle').tap()
    await expect(page.locator('.burger-photo-stage [data-testid="burger-still"]')).toHaveAttribute('data-ready', 'true')
    await expect(page.locator('.burger-photo-stage img')).toHaveAttribute('src', /^data:image\/webp/)
    await expect(page.getByTestId(`mod-mb-m-${id}`)).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('burger-layers-toggle').tap()
    await expect(page.getByTestId('mod-mb-m-ponto')).toHaveAttribute('aria-pressed', 'true')
  }
  await page.getByTestId('burger-layers-toggle').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await page.screenshot({ path: info.outputPath('australian-open.png') })
  await page.getByTestId('burger-photo-toggle').tap()
  await page.waitForTimeout(800)
  await page.screenshot({ path: info.outputPath('australian-closed.png') })
  expect(errors).toEqual([])
})

test('drag out/in de extra recalcula o preço; retirar incluído registra sem no carrinho', async ({ page }) => {
  await enter(page); await ready(page)
  await page.getByTestId('mod-mb-m-bacon').tap()
  await expect(page.getByTestId('sheet-total')).toHaveText(/45,00/)
  await drag(page, 'extra-mb-m-bacon')
  await expect(page.getByTestId('burger-layer-extra-mb-m-bacon')).toHaveCount(0)
  await expect(page.getByTestId('sheet-total')).toHaveText(/39,00/)
  await drag(page, 'extra-mb-m-bacon', true)
  await expect(page.getByTestId('burger-layer-extra-mb-m-bacon')).toBeVisible()
  await expect(page.getByTestId('sheet-total')).toHaveText(/45,00/)
  // Equivalent keyboard path keeps every ingredient operable without a drag.
  await page.getByTestId('burger-hit-base-onion-crispy').focus()
  await page.keyboard.press('Enter')
  await page.getByTestId('burger-remove-selected').tap()
  await expect(page.getByTestId('mod-mb-m-sem-cebola')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('sheet-total')).toHaveText(/45,00/)
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-line-mb-p-cheddar-bacon')).toContainText('Sem cebola crispy')
})

test('receitas respeitam proteínas e estoque; showcase permite inspecionar todos os pães', async ({ page }) => {
  await enter(page)
  await expect(page.getByTestId('burger-recipe-mb-p-veggie')).toBeDisabled()
  await page.getByTestId('burger-recipe-mb-p-smash-duplo').tap()
  await expect(page.getByTestId('burger-layer-meat-1')).toHaveAttribute('data-asset', 'smash')
  await page.getByTestId('burger-recipe-mb-p-frango').tap()
  await expect(page.getByTestId('burger-layer-meat-0')).toHaveAttribute('data-asset', 'chicken')
  await expect(page.getByTestId('mod-mb-m-ponto')).toHaveCount(0)
  await page.getByTestId('mod-mb-m-sem-gluten').tap()
  await expect(page.getByTestId('sheet-total')).toHaveText(/37,00/)
  await page.goto('/?tenant=maxburger&burger-pilot')
  for (const recipe of ['classic', 'cheddar-bacon', 'smash-double', 'chicken', 'veggie']) {
    await page.getByTestId(`burger-pilot-recipe-${recipe}`).tap()
    for (const bread of ['brioche', 'australian', 'gluten-free']) {
      await page.getByTestId(`burger-pilot-bread-${bread}`).tap()
      await expect(page.getByTestId('burger-layer-top')).toHaveAttribute('data-asset', `${bread}-top`)
      await expect.poll(() => page.getByTestId('burger-stage').locator('img').evaluateAll((imgs) => imgs.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0))).toBe(true)
    }
  }
})

test('falha de asset não bloqueia compra e não deixa uma camada quebrada na tela', async ({ page }) => {
  await page.route('**/demo/maxburger/burger/blend.webp', (route) => route.abort())
  await enter(page)
  await expect(page.getByTestId('burger-builder')).toHaveAttribute('data-view', 'photo')
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-brioche').tap()
  await page.getByTestId('mod-mb-m-ponto').tap()
  await expect(page.locator('.burger-photo-stage [data-testid="burger-still"]')).toHaveAttribute('data-fallback', 'true')
  await expect(page.getByTestId('burger-layers-toggle')).toBeDisabled()
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-total')).toHaveText(/36,00/)
})

test('movimento reduzido e os demais tenants mantêm suas jornadas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page)
  await expect(page.locator('.burger-ambient')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByTestId('product-mb-p-refri').tap()
  await expect(page.getByTestId('burger-builder')).toHaveCount(0)
  await page.goto('/?tenant=cafe-sabor')
  await page.getByTestId('attract').tap(); await page.getByTestId('mode-dine-in').tap(); await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('menu-grid')).toBeVisible()
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
})

test('combo e quantidade seguem até o pagamento de demonstração e a confirmação', async ({ page }) => {
  await enter(page); await ready(page)
  await page.getByTestId('mod-mb-m-combo').tap()
  await page.getByTestId('mod-mb-m-ovo').tap()
  await page.getByTestId('product-stepper').getByRole('button', { name: /aumentar/i }).tap()
  await expect(page.getByTestId('sheet-total')).toHaveText(/116,00/)
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await expect(page.getByTestId('cart-total')).toHaveText(/116,00/)
  await page.getByTestId('to-payment').tap()
  await expect(page.getByTestId('screen-payment')).toContainText('R$ 116,00')
  await page.getByTestId('pay-now').tap()
  await expect(page.getByTestId('screen-receipt')).toBeVisible({ timeout: 20000 })
})
