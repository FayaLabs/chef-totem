import { expect, test, type Page } from '@playwright/test'

async function toPayment(page: Page) {
  await page.goto('/')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await page.getByTestId('product-p-coca').tap()
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await page.getByTestId('to-payment').tap()
  await expect(page.getByTestId('screen-payment')).toBeVisible()
}

test.describe('M5 · pagamento', () => {
  test('mostra o total e os três meios', async ({ page }) => {
    await toPayment(page)
    await expect(page.getByTestId('screen-payment')).toContainText('R$ 8,00')
    for (const id of ['pay-card', 'pay-pix', 'pay-cash']) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    await expect(page.getByTestId('pay-card')).toHaveAttribute('aria-pressed', 'true')
  })

  test('guia o cliente pelos estados da maquininha', async ({ page }) => {
    await toPayment(page)
    await page.getByTestId('pay-now').tap()
    // The instruction has to be on screen while the terminal waits, or the
    // customer stands there looking at a spinner.
    await expect(page.getByTestId('payment-status')).toContainText(/maquininha/i)
  })

  test('cancelar está disponível DURANTE a cobrança', async ({ page }) => {
    await toPayment(page)
    await page.getByTestId('pay-now').tap()
    await expect(page.getByTestId('payment-status')).toBeVisible()
    // A customer who cannot back out of a payment screen calls staff.
    await expect(page.getByTestId('payment-back')).toBeEnabled()
    await expect(page.getByTestId('payment-back')).toContainText(/cancelar/i)
    await page.getByTestId('payment-back').tap()
    await expect(page.getByTestId('screen-menu')).toBeVisible()
  })

  test('o pedido não gravado é dito ao cliente, com o código para o caixa', async ({ page }) => {
    // No device session in CI, so placeOrder fails — which is exactly the path
    // that must never end with the customer silently back at the menu having
    // paid. The money is gone; the screen has to say so.
    await toPayment(page)
    await page.getByTestId('pay-now').tap()
    const error = page.getByTestId('payment-error')
    await expect(error).toBeVisible({ timeout: 20_000 })
    await expect(error).toContainText(/procure o caixa/i)
    await expect(error).toContainText(/pagamento aprovado/i)
  })
})
