import { expect, test, type Page } from '@playwright/test'

async function toPayment(page: Page, url = '/') {
  await page.goto(url)
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await page.getByTestId('product-zd-p-refri').tap()
  await page.getByTestId('add-to-order').tap()
  await page.getByTestId('open-cart').tap()
  await page.getByTestId('to-payment').tap()
  await expect(page.getByTestId('screen-payment')).toBeVisible()
}

test.describe('M5 · pagamento', () => {
  test('mostra o total e os três meios', async ({ page }) => {
    await toPayment(page)
    await expect(page.getByTestId('screen-payment')).toContainText('R$ 8,00')
    for (const id of ['pay-credit', 'pay-debit', 'pay-pix']) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    await expect(page.getByTestId('pay-credit')).toHaveAttribute('aria-pressed', 'true')
  })

  test('dinheiro não é oferecido, e a tela diz para onde ir', async ({ page }) => {
    // O painel não tem gaveta. Um botão que ele não consegue honrar é o cliente
    // parado com a cédula na mão e ninguém a quem entregá-la.
    await toPayment(page)
    await expect(page.getByTestId('pay-cash')).toHaveCount(0)
    await expect(page.getByTestId('payment-no-cash')).toContainText(/dinheiro.*caixa/i)
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
    // `?order=fail` (ver place-order.ts) força a gravação a falhar — o caminho
    // que nunca pode terminar com o cliente de volta ao cardápio tendo pago. O
    // dinheiro saiu; a tela tem de dizer.
    await toPayment(page, '/?order=fail')
    await page.getByTestId('pay-now').tap()
    const error = page.getByTestId('payment-error')
    await expect(error).toBeVisible({ timeout: 20_000 })
    await expect(error).toContainText(/procure o caixa/i)
    await expect(error).toContainText(/pagamento aprovado/i)
  })
})

test.describe('M5 · o garçom acompanha o pagamento', () => {
  test('escolher cartão faz o garçom explicar a maquininha', async ({ page }) => {
    // A instrução que mais se perde lida: o cliente está de pé, olhando um
    // painel a um metro. Falada, ela chega antes.
    await toPayment(page, '/?waiter=scripted')
    await expect(page.getByTestId('waiter-dock')).toBeVisible()

    await page.getByTestId('pay-pix').tap()
    await expect(page.getByTestId('waiter-line-text')).toContainText(/pix/i)

    await page.getByTestId('pay-debit').tap()
    await expect(page.getByTestId('waiter-line-text')).toContainText(/maquininha/i)
  })

  test('na tela de pagamento ele acompanha, não vende', async ({ page }) => {
    // Um garçom que oferece sobremesa na tela de pagamento é um garçom entre o
    // cliente e o cartão.
    await toPayment(page, '/?waiter=scripted')
    await expect(page.locator('[data-testid^=waiter-suggestion-]')).toHaveCount(0)
    await expect(page.getByTestId('waiter-panel')).toHaveCount(0)
  })

  test('pedido confirmado: ele diz a senha e se despede', async ({ page }) => {
    await toPayment(page, '/?waiter=scripted')
    await page.getByTestId('pay-now').tap()
    await expect(page.getByTestId('screen-receipt')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('waiter-line-text')).toContainText(/senha/i)
  })
})
