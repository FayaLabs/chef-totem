import { expect, test, type Page } from '@playwright/test'

// The waiter is off by default; `?waiter=scripted` turns on the deterministic
// one. No model in CI — an LLM in a test suite is flaky and billed, and none of
// what these specs assert is a question about the model.
async function toMenuWithWaiter(page: Page) {
  await page.goto('/?waiter=scripted')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('waiter-dock')).toBeVisible()
}

test.describe('V2 · o garçom presente', () => {
  test('a faixa RESERVA espaço: o último prato fica alcançável', async ({ page }) => {
    // This app has shipped the "control on top of something" bug twice. Content
    // passing behind fixed chrome WHILE scrolling is normal; what must never
    // happen is the last item being unreachable because the chrome ate it.
    await toMenuWithWaiter(page)
    await page.locator('[data-testid=menu-grid]').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await page.waitForTimeout(400)

    const dock = (await page.getByTestId('waiter-dock').boundingBox())!
    const cards = page.locator('button[data-testid^=product-]')
    const last = (await cards.nth((await cards.count()) - 1).boundingBox())!
    expect(
      last.y + last.height,
      'rolando até o fim, o último prato ainda fica debaixo da faixa do garçom',
    ).toBeLessThanOrEqual(dock.y + 1)
  })

  test('o microfone vive na zona de alcance e tem tamanho de quiosque', async ({ page }) => {
    await toMenuWithWaiter(page)
    const stage = (await page.locator('[data-totem-stage]').boundingBox())!
    const mic = (await page.getByTestId('waiter-mic').boundingBox())!
    // Taking the order is the primary path, so it lives below 40%.
    expect(mic.y).toBeGreaterThan(stage.y + stage.height * 0.4)
    expect(mic.height).toBeGreaterThanOrEqual(88)
    expect(mic.width).toBeGreaterThanOrEqual(88)
  })

  test('o orbe muda de estado ao ouvir — é o único sinal de que o painel escuta', async ({ page }) => {
    await toMenuWithWaiter(page)
    const orb = page.getByTestId('waiter-orb')
    await expect(orb).toHaveAttribute('data-phase', 'idle')

    await page.getByTestId('waiter-mic').dispatchEvent('pointerdown')
    await expect(orb).toHaveAttribute('data-phase', 'listening')
    await expect(page.getByTestId('waiter-dock')).toContainText(/ouvindo/i)

    await page.getByTestId('waiter-mic').dispatchEvent('pointerup')
    await expect(orb).toHaveAttribute('data-phase', 'idle')
  })

  test('um pedido falado monta o carrinho E move a tela', async ({ page }) => {
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma calabresa com média e borda')
    await page.getByTestId('waiter-send').tap()

    await expect(page.getByTestId('open-cart')).toContainText('(1)')
    // 59,00 + 8,00 (média) + 9,00 (borda)
    await expect(page.getByTestId('checkout')).toContainText('R$ 76,00')
  })

  test('acento não derruba o pedido', async ({ page }) => {
    // Um transcript de voz não escreve acento de forma confiável.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma calabresa com media')
    await page.getByTestId('waiter-send').tap()
    await expect(page.getByTestId('open-cart')).toContainText('(1)')
  })

  test('o garçom sai da frente do prato que ele mesmo abriu', async ({ page }) => {
    // Mostrar o trabalho é o motivo das tools moverem a tela; um painel
    // estacionado por cima do resultado anula isso.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma calabresa')
    await page.getByTestId('waiter-send').tap()

    await expect(page.getByTestId('product-sheet')).toBeVisible()
    await expect(page.getByTestId('waiter-panel')).toHaveCount(0)
  })

  test('ele não consegue adicionar item com escolha obrigatória em aberto', async ({ page }) => {
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma calabresa')
    await page.getByTestId('waiter-send').tap()

    await expect(page.getByTestId('open-cart')).toBeDisabled()
    await expect(page.getByTestId('waiter-line-text')).toContainText(/falta escolher tamanho/i)
  })

  test('o garçom não existe fora do cardápio', async ({ page }) => {
    // Um assistente oferecendo ajuda na tela de pagamento é um assistente
    // entre o cliente e o cartão dele.
    await page.goto('/?waiter=scripted')
    await expect(page.getByTestId('waiter-dock')).toHaveCount(0)
    await page.getByTestId('attract').tap()
    await expect(page.getByTestId('waiter-dock')).toHaveCount(0)
  })
})
