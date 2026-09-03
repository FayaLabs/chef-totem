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

  test('o orbe vive na zona de alcance e tem tamanho de quiosque', async ({ page }) => {
    await toMenuWithWaiter(page)
    const stage = (await page.locator('[data-totem-stage]').boundingBox())!
    const mic = (await page.getByTestId('talk-button').boundingBox())!
    // Taking the order is the primary path, so it lives below 40%.
    expect(mic.y).toBeGreaterThan(stage.y + stage.height * 0.4)
    expect(mic.height).toBeGreaterThanOrEqual(88)
    expect(mic.width).toBeGreaterThanOrEqual(88)
  })

  test('o orbe muda de estado ao ouvir — é o único sinal de que o painel escuta', async ({ page }) => {
    await toMenuWithWaiter(page)
    const orb = page.getByTestId('voice-orb')
    await expect(orb).toHaveAttribute('data-phase', 'idle')

    // Toca e trava; toca de novo e para. Segurar o botão enquanto se pensa no
    // pedido é desconfortável, e um dedo que escorrega cortava a frase.
    await page.getByTestId('talk-button').tap()
    await expect(orb).toHaveAttribute('data-phase', 'listening')
    await expect(page.getByTestId('waiter-dock')).toContainText(/ouvindo/i)

    await page.getByTestId('talk-button').tap()
    await expect(orb).toHaveAttribute('data-phase', 'idle')
  })

  test('um pedido falado monta o carrinho E move a tela', async ({ page }) => {
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma pepperoni com média e burrata')
    await page.getByTestId('waiter-send').tap()

    await expect(page.getByTestId('open-cart')).toContainText('(1)')
    // 59,00 + 8,00 (média) + 9,00 (burrata)
    await expect(page.getByTestId('checkout')).toContainText('R$ 76,00')
  })

  test('acento não derruba o pedido', async ({ page }) => {
    // Um transcript de voz não escreve acento de forma confiável.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma pepperoni com media')
    await page.getByTestId('waiter-send').tap()
    await expect(page.getByTestId('open-cart')).toContainText('(1)')
  })

  test('o garçom sai da frente do prato que ele mesmo abriu', async ({ page }) => {
    // Mostrar o trabalho é o motivo das tools moverem a tela; um painel
    // estacionado por cima do resultado anula isso.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma pepperoni')
    await page.getByTestId('waiter-send').tap()

    await expect(page.getByTestId('product-sheet')).toBeVisible()
    await expect(page.getByTestId('waiter-panel')).toHaveCount(0)
  })

  test('ele não consegue adicionar item com escolha obrigatória em aberto', async ({ page }) => {
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('quero uma pepperoni')
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

test.describe('V3 · o erro que sai', () => {
  test('tocar no orbe de novo apaga a frase vermelha', async ({ page }) => {
    // A frase dizia "toque no orbe e tente de novo" e continuava lá depois de o
    // cliente fazer exatamente isso — o jeito mais rápido de ensinar alguém a
    // não confiar na tela.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('/erro')
    await page.getByTestId('waiter-send').tap()

    // O erro mora na FAIXA, não no painel: ele é sobre o canal, não sobre a
    // conversa. Quem está lendo a conversa não precisa de uma bolha vermelha
    // dizendo que o microfone falhou.
    await page.getByTestId('sheet-scrim').tap()
    await expect(page.getByTestId('waiter-line-text')).toContainText(/não consegui te ouvir/i)

    await page.getByTestId('talk-button').tap()
    await expect(page.getByTestId('waiter-line-text')).not.toContainText(/não consegui te ouvir/i)
    await expect(page.getByTestId('voice-orb')).toHaveAttribute('data-phase', 'listening')
  })
})

test.describe('V3 · o garçom aponta', () => {
  test('recomendar desce até o prato, destaca ele e apaga os outros', async ({ page }) => {
    // O problema clássico do assistente de voz: ele diz "o mac and cheese é o
    // mais pedido" e o cliente fica procurando qual dos doze é. Um nome falado
    // não vira posição na tela sozinho.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('o que você recomenda?')
    await page.getByTestId('waiter-send').tap()
    await page.getByTestId('sheet-scrim').tap()

    const spotlight = page.locator('[data-highlighted="true"]')
    await expect(spotlight).toHaveCount(1)

    // Está à vista: destacar fora da tela não resolve nada. O CENTRO do cartão
    // dentro da grade, e não as bordas — ele cresce 6%, então transborda a
    // borda por alguns pixels de propósito, e é isso que faz o destaque
    // parecer estar por cima.
    const grid = (await page.getByTestId('menu-grid').boundingBox())!
    const card = (await spotlight.boundingBox())!
    const centre = card.y + card.height / 2
    expect(centre).toBeGreaterThan(grid.y)
    expect(centre).toBeLessThan(grid.y + grid.height)

    // Os vizinhos recuam — é isso que faz o destaque ser um destaque.
    const other = page.locator('button[data-testid^=product-]:not([data-highlighted])').first()
    expect(Number(await other.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.6)
  })

  test('o toque do cliente apaga o destaque na hora', async ({ page }) => {
    // O destaque é do garçom; a tela é do cliente. No instante em que a pessoa
    // mexe, o dedo dela ganha.
    await toMenuWithWaiter(page)
    await page.getByTestId('waiter-line').tap()
    await page.getByTestId('waiter-input').fill('o que você recomenda?')
    await page.getByTestId('waiter-send').tap()
    await page.getByTestId('sheet-scrim').tap()
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(1)

    await page.getByTestId('filter-promo').tap()
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0)
  })
})
