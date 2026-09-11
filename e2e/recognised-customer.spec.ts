import { dismissPizzaIntro } from './pizza-helpers'
import { expect, test, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// M10 · o cliente reconhecido.
//
// Um telefone entra e três coisas saem: o nome, o crédito e a oferta do clube.
// A suíte roda contra o catálogo `demo`, que traz também a busca de cliente
// falsa (`customer-lookup.ts`) — final 1111 é a Marina, com R$ 18 de crédito e
// 10% do Clube Chef a partir de R$ 30. Final 2222 é o Rafael, conhecido e sem
// nenhuma vantagem: o caso comum, e o que prova que a tela não inventa
// benefício quando não há.
// ---------------------------------------------------------------------------

async function typePhone(page: Page, digits: string) {
  for (const digit of digits) await page.getByTestId(`key-${digit}`).tap()
}

async function identifyAs(page: Page, digits: string) {
  await page.goto('/')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await typePhone(page, digits)
  await page.getByTestId('identify-confirm').tap()
  await dismissPizzaIntro(page)
}

test.describe('M10 · reconhecimento', () => {
  test('quem é do clube é chamado pelo nome, com crédito e oferta na tela', async ({ page }) => {
    await identifyAs(page, '11987651111')

    // Sem tela intermediária: o telefone leva direto ao cardápio, e é o
    // cabeçalho dele que carrega nome, crédito e oferta — de forma permanente,
    // não num cartão que some sozinho.
    await expect(page.getByTestId('menu-grid')).toBeVisible()
    await expect(page.getByTestId('menu-greeting')).toContainText(/marina/i)
    await expect(page.getByTestId('header-credit')).toContainText('R$ 18,00')
    await expect(page.getByTestId('header-offer')).toContainText(/clube/i)
    await expect(page.getByTestId('identify-greeting')).toHaveCount(0)
  })

  test('um telefone desconhecido NÃO é denunciado — só segue', async ({ page }) => {
    // Dizer "esse número não é cliente" transformaria o teclado num oráculo de
    // quais números existem na base.
    await identifyAs(page, '11900000000')
    await expect(page.getByTestId('menu-grid')).toBeVisible()
    await expect(page.getByTestId('menu-greeting')).toHaveCount(0)
  })

  test('cliente conhecido sem vantagem nenhuma não ganha vantagem inventada', async ({ page }) => {
    await identifyAs(page, '11987652222')
    await expect(page.getByTestId('menu-greeting')).toContainText(/rafael/i)
    await expect(page.getByTestId('header-credit')).toHaveCount(0)
    await expect(page.getByTestId('header-offer')).toHaveCount(0)
  })

  test('a oferta e o crédito abatem o total, e a tela diz de onde veio cada um', async ({ page }) => {
    await identifyAs(page, '11987651111')

    // R$ 59,00 de pizza passa do mínimo de R$ 30 da oferta.
    await page.getByTestId('product-ph-p-pepperoni').tap()
    await page.getByTestId('pizza-mode-whole').tap()
    const mods = page.locator('[data-testid^="mod-"]')
    for (let i = 0; i < (await mods.count()); i++) {
      if (await page.getByTestId('add-to-order').isEnabled()) break
      await mods.nth(i).tap()
    }
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()
    await page.getByTestId('to-payment').tap()

    await expect(page.getByTestId('payment-breakdown')).toContainText('R$ 59,00')
    await expect(page.getByTestId('payment-offer')).toContainText(/clube chef · 10% off/i)
    await expect(page.getByTestId('payment-credit')).toContainText('R$ 18,00')
    // 59,00 − 5,90 (10%) − 18,00 (crédito) = 35,10. A conta na tela é a conta.
    await expect(page.getByTestId('payment-total')).toHaveText('R$ 35,10')

    // Guardar o saldo para a próxima é uma escolha legítima — e reversível.
    await page.getByTestId('toggle-credit').tap()
    await expect(page.getByTestId('payment-credit')).toHaveCount(0)
    await expect(page.getByTestId('payment-total')).toHaveText('R$ 53,10')
    await page.getByTestId('toggle-credit').tap()
    await expect(page.getByTestId('payment-credit')).toBeVisible()
  })

  test('o recibo oferece o WhatsApp para quem deu o telefone, e promete sem mentir', async ({ page }) => {
    await identifyAs(page, '11987651111')
    await page.getByTestId('product-ph-p-refri').tap()
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()
    await page.getByTestId('to-payment').tap()
    await page.getByTestId('pay-now').tap()
    await expect(page.getByTestId('screen-receipt')).toBeVisible({ timeout: 20_000 })

    const offer = page.getByTestId('receipt-whatsapp')
    await expect(offer).toBeVisible()
    // O número aparece mascarado: a tela do recibo é pública.
    await expect(offer).toContainText('1111')
    await expect(offer).not.toContainText('98765')

    await offer.tap()
    // "Vai chegar", nunca "enviado": a mensagem nasce na fila, e o broker
    // (FAY-1423) é quem a tira de lá.
    await expect(page.getByTestId('whatsapp-queued')).toContainText(/vai chegar/i)
  })

  test('sem telefone não há oferta de WhatsApp — ninguém é perguntado de novo no fim', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await page.getByTestId('identify-skip').tap()
  await dismissPizzaIntro(page)
    await page.getByTestId('product-ph-p-refri').tap()
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()
    await page.getByTestId('to-payment').tap()
    await page.getByTestId('pay-now').tap()
    await expect(page.getByTestId('screen-receipt')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('receipt-whatsapp')).toHaveCount(0)
  })
})

test.describe('M10 · cancelar', () => {
  test('cancelar com o carrinho vazio sai na hora', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await page.getByTestId('identify-skip').tap()
  await dismissPizzaIntro(page)
    await page.getByTestId('reset').tap()
    await expect(page.getByTestId('attract')).toBeVisible()
  })

  test('cancelar com itens escolhidos PERGUNTA antes de jogar fora', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await page.getByTestId('identify-skip').tap()
  await dismissPizzaIntro(page)
    await page.getByTestId('product-ph-p-refri').tap()
    await page.getByTestId('add-to-order').tap()

    await page.getByTestId('reset').tap()
    await expect(page.getByTestId('cancel-sheet')).toBeVisible()

    // Continuar preserva o carrinho: o toque errado não custa o pedido.
    await page.getByTestId('cancel-keep').tap()
    await expect(page.getByTestId('cancel-sheet')).toHaveCount(0)
    await expect(page.getByTestId('open-cart')).toBeEnabled()

    await page.getByTestId('reset').tap()
    await page.getByTestId('cancel-discard').tap()
    await expect(page.getByTestId('attract')).toBeVisible()
  })

  test('o topo é a marca e o cancelar, e um não cobre o outro', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await page.getByTestId('identify-skip').tap()
  await dismissPizzaIntro(page)

    const cancel = (await page.getByTestId('reset').boundingBox())!
    const logo = (await page.getByTestId('header-logo').boundingBox())!
    // O cancelar já foi `absolute` e caiu em cima do que dividia a linha com
    // ele. Divide de novo — agora com a logo.
    expect(logo.x + logo.width, 'a logo termina antes de o cancelar começar').toBeLessThanOrEqual(cancel.x + 1)
    expect(cancel.height, 'régua de quiosque vale para o cancelar também').toBeGreaterThanOrEqual(88)
    // Data, senha e título saíram do cabeçalho: a senha só vale no recibo.
    await expect(page.locator('header')).not.toContainText(/senha/i)
  })
})
