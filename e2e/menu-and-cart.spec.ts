import { expect, test, type Page } from '@playwright/test'

async function toMenu(page: Page) {
  await page.goto('/')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('menu-grid')).toBeVisible()
}

test.describe('M3 · cardápio', () => {
  test('rail de categorias filtra o grid', async ({ page }) => {
    await toMenu(page)
    await expect(page.getByTestId('product-p-calabresa')).toBeVisible()
    await expect(page.getByTestId('product-p-coca')).toBeVisible()

    await page.getByTestId('cat-c-bebidas').tap()
    await expect(page.getByTestId('product-p-coca')).toBeVisible()
    await expect(page.getByTestId('product-p-calabresa')).toHaveCount(0)
  })

  test('o filtro de promo mostra só quem tem preço riscado', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('filter-promo').tap()
    await expect(page.getByTestId('product-p-calabresa')).toBeVisible()
    await expect(page.getByTestId('product-p-margherita')).toHaveCount(0)
  })

  test('esgotado fica apagado e inerte, nunca some', async ({ page }) => {
    // A dish that vanishes sends the customer to the counter to ask where it
    // went; a dish that is visibly out answers the question by itself.
    await toMenu(page)
    const soldOut = page.getByTestId('product-p-cacio')
    await expect(soldOut).toBeVisible()
    await expect(soldOut).toBeDisabled()
    await expect(soldOut).toContainText(/esgotado/i)
  })

  test('a barra inferior reflete o carrinho', async ({ page }) => {
    await toMenu(page)
    await expect(page.getByTestId('checkout')).toBeDisabled()
    await expect(page.getByTestId('checkout')).toContainText(/escolha um item/i)

    await page.getByTestId('product-p-coca').tap()
    await page.getByTestId('add-to-order').tap()
    await expect(page.getByTestId('open-cart')).toContainText('(1)')
    await expect(page.getByTestId('checkout')).toContainText('R$ 8,00')
  })
})

test.describe('M4 · produto e carrinho', () => {
  test('grupo obrigatório bloqueia e DIZ o que falta', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-p-calabresa').tap()

    const add = page.getByTestId('add-to-order')
    await expect(add).toBeDisabled()
    // Not just grey: a disabled button that explains nothing teaches nothing.
    await expect(add).toContainText(/escolha: tamanho/i)

    await page.getByTestId('mod-m-media').tap()
    await expect(add).toBeEnabled()
  })

  test('o preço recalcula ao vivo com modificador e quantidade', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-p-calabresa').tap()
    await page.getByTestId('mod-m-media').tap() // 59,00 + 8,00
    await expect(page.getByTestId('sheet-total')).toHaveText('R$ 67,00')

    await page.getByTestId('mod-m-borda').tap() // + 9,00
    await expect(page.getByTestId('sheet-total')).toHaveText('R$ 76,00')

    await page.getByTestId('product-stepper').getByTestId('stepper-plus').tap()
    await expect(page.getByTestId('sheet-total')).toHaveText('R$ 152,00')
  })

  test('duas linhas do mesmo prato com modificadores diferentes NÃO se fundem', async ({ page }) => {
    // "uma com bacon, uma sem" são duas coisas que a cozinha faz diferente.
    await toMenu(page)

    await page.getByTestId('product-p-calabresa').tap()
    await page.getByTestId('mod-m-media').tap()
    await page.getByTestId('add-to-order').tap()

    await page.getByTestId('product-p-calabresa').tap()
    await page.getByTestId('mod-m-grande').tap()
    await page.getByTestId('mod-m-bacon').tap()
    await page.getByTestId('add-to-order').tap()

    await page.getByTestId('open-cart').tap()
    await expect(page.getByTestId('cart-sheet').getByText('CALABRESA')).toHaveCount(2)
    await expect(page.getByTestId('cart-total')).toHaveText('R$ 149,00')
  })

  test('o carrinho mostra os modificadores de cada linha', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-p-calabresa').tap()
    await page.getByTestId('mod-m-media').tap()
    await page.getByTestId('mod-m-sem-cebola').tap()
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()

    await expect(page.getByTestId('cart-line-p-calabresa')).toContainText('Média')
    await expect(page.getByTestId('cart-line-p-calabresa')).toContainText('Sem cebola')
  })

  test('remover a última linha esvazia o carrinho', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-p-coca').tap()
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()
    await page.getByTestId('cart-remove-p-coca').tap()
    await expect(page.getByTestId('cart-sheet')).toContainText(/vazio/i)
    await expect(page.getByTestId('to-payment')).toBeDisabled()
  })
})
