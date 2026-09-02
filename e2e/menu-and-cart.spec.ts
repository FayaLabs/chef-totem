import { expect, test, type Page } from '@playwright/test'

async function toMenu(page: Page) {
  await page.goto('/')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('menu-grid')).toBeVisible()
}

/** Abre um prato e espera o sheet parar de se mover. */
async function openProduct(page: Page, id: string) {
  await page.getByTestId(`product-${id}`).tap()
  await expect(page.getByTestId('product-sheet')).toBeVisible()
  await page.waitForTimeout(400)
}

test.describe('M3 · cardápio', () => {
  test('rail de categorias filtra o grid', async ({ page }) => {
    await toMenu(page)
    await expect(page.getByTestId('product-zd-p-pepperoni')).toBeVisible()
    await expect(page.getByTestId('product-zd-p-refri')).toBeVisible()

    await page.getByTestId('cat-zd-c-bebidas').tap()
    await expect(page.getByTestId('product-zd-p-refri')).toBeVisible()
    await expect(page.getByTestId('product-zd-p-pepperoni')).toHaveCount(0)
  })

  test('o filtro de promo mostra só quem tem preço riscado', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('filter-promo').tap()
    await expect(page.getByTestId('product-zd-p-pepperoni')).toBeVisible()
    await expect(page.getByTestId('product-zd-p-margherita')).toHaveCount(0)
  })

  test('esgotado fica apagado e inerte, nunca some', async ({ page }) => {
    // A dish that vanishes sends the customer to the counter to ask where it
    // went; a dish that is visibly out answers the question by itself.
    await toMenu(page)
    const soldOut = page.getByTestId('product-zd-p-burrata')
    await expect(soldOut).toBeVisible()
    await expect(soldOut).toBeDisabled()
    await expect(soldOut).toContainText(/esgotado/i)
  })

  test('a barra inferior reflete o carrinho', async ({ page }) => {
    await toMenu(page)
    await expect(page.getByTestId('checkout')).toBeDisabled()
    await expect(page.getByTestId('checkout')).toContainText(/escolha uma pizza/i)

    await page.getByTestId('product-zd-p-refri').tap()
    await page.getByTestId('add-to-order').tap()
    await expect(page.getByTestId('open-cart')).toContainText('(1)')
    await expect(page.getByTestId('checkout')).toContainText('R$ 8,00')
  })
})

test.describe('M4 · produto e carrinho', () => {
  test('grupo obrigatório bloqueia e DIZ o que falta', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-zd-p-pepperoni').tap()

    const add = page.getByTestId('add-to-order')
    await expect(add).toBeDisabled()
    // Not just grey: a disabled button that explains nothing teaches nothing.
    await expect(add).toContainText(/escolha: tamanho/i)

    await page.getByTestId('mod-zd-m-media').tap()
    await expect(add).toBeEnabled()
  })

  test('o preço recalcula ao vivo com modificador e quantidade', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-zd-p-pepperoni').tap()
    await page.getByTestId('mod-zd-m-media').tap() // 59,00 + 8,00
    await expect(page.getByTestId('sheet-total')).toHaveText('R$ 67,00')

    await page.getByTestId('mod-zd-m-burrata').tap() // + 9,00
    await expect(page.getByTestId('sheet-total')).toHaveText('R$ 76,00')

    await page.getByTestId('product-stepper').getByTestId('stepper-plus').tap()
    await expect(page.getByTestId('sheet-total')).toHaveText('R$ 152,00')
  })

  test('duas linhas do mesmo prato com modificadores diferentes NÃO se fundem', async ({ page }) => {
    // "uma com bacon, uma sem" são duas coisas que a cozinha faz diferente.
    await toMenu(page)

    // `settled` e não `toBeVisible`: o sheet entra com 260ms de translateY, e
    // `tap()` calcula a coordenada, confere estabilidade e só então despacha o
    // toque — se o elemento andou nesse meio, o toque cai ao lado. Não é
    // defeito da tela (o navegador acerta o hit-test de um elemento
    // transformado); é o harness correndo com a animação.
    await openProduct(page, 'zd-p-pepperoni')
    await page.getByTestId('mod-zd-m-media').tap()
    await page.getByTestId('add-to-order').tap()

    await openProduct(page, 'zd-p-pepperoni')
    await page.getByTestId('mod-zd-m-grande').tap()
    await expect(page.getByTestId('mod-zd-m-grande')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('mod-zd-m-nduja').tap()
    await page.getByTestId('add-to-order').tap()

    await page.getByTestId('open-cart').tap()
    await expect(page.getByTestId('cart-sheet').getByText('PEPPERONI')).toHaveCount(2)
    await expect(page.getByTestId('cart-total')).toHaveText('R$ 149,00')
  })

  test('o carrinho mostra os modificadores de cada linha', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-zd-p-pepperoni').tap()
    await page.getByTestId('mod-zd-m-media').tap()
    await page.getByTestId('mod-zd-m-sem-cebola').tap()
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()

    await expect(page.getByTestId('cart-line-zd-p-pepperoni')).toContainText('Média')
    await expect(page.getByTestId('cart-line-zd-p-pepperoni')).toContainText('Sem cebola')
  })

  test('remover a última linha esvazia o carrinho', async ({ page }) => {
    await toMenu(page)
    await page.getByTestId('product-zd-p-refri').tap()
    await page.getByTestId('add-to-order').tap()
    await page.getByTestId('open-cart').tap()
    await page.getByTestId('cart-remove-zd-p-refri').tap()
    await expect(page.getByTestId('cart-sheet')).toContainText(/vazio/i)
    await expect(page.getByTestId('to-payment')).toBeDisabled()
  })
})

test.describe('M4 · o item entrando no carrinho', () => {
  test('a barra mostra O QUE entrou, com foto, e volta a ser o contador', async ({ page }) => {
    // Um contador pulando de (1) para (2) é a confirmação mais fraca possível:
    // o número está no canto oposto de onde o dedo tocou. Sem ver nada
    // acontecer, o cliente adiciona de novo — é assim que nasce pedido em dobro.
    await toMenu(page)
    await openProduct(page, 'zd-p-pepperoni')
    await page.getByTestId('mod-zd-m-media').tap()
    await page.getByTestId('add-to-order').tap()

    const flash = page.getByTestId('cart-flash')
    await expect(flash).toBeVisible()
    await expect(flash).toContainText(/pepperoni/i)
    await expect(flash.locator('img')).toBeVisible()
    // Enquanto o flash está no ar, o contador não está — é a mesma metade da
    // barra, não uma terceira coisa espremida ao lado.
    await expect(page.getByTestId('open-cart')).toHaveCount(0)

    await expect(page.getByTestId('open-cart')).toContainText('(1)', { timeout: 5_000 })
    await expect(page.getByTestId('cart-flash')).toHaveCount(0)
  })

  test('adicionar o MESMO prato de novo pisca de novo', async ({ page }) => {
    // O gatilho é uma sequência, não o nome: um objeto igual ao anterior não
    // reinicia efeito nenhum, e a segunda adição passaria sem confirmação.
    await toMenu(page)
    await openProduct(page, 'zd-p-refri')
    await page.getByTestId('add-to-order').tap()
    await expect(page.getByTestId('open-cart')).toContainText('(1)', { timeout: 5_000 })

    await openProduct(page, 'zd-p-refri')
    await page.getByTestId('add-to-order').tap()
    await expect(page.getByTestId('cart-flash')).toBeVisible()
  })
})
