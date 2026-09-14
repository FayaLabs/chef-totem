import { expect, test, type Page } from '@playwright/test'

// O que ele pergunta tem de estar na tela.
//
// O painel diz ao modelo qual grupo perguntar, e não levava a tela até lá: o
// cliente ouvia "qual ponto da carne?" olhando o pão, com a etapa perguntada
// duas rolagens abaixo. Pelo dedo a tela já descia sozinha; pela voz, não.

async function toMenu(page: Page) {
  await page.goto('/?waiter=scripted&tenant=maxburger')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  // A MaxBurger abre o sheet do lanche sozinha ao entrar no cardápio; o teste
  // fecha para começar da grade, como quem tocou fora.
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('waiter-dock')).toBeVisible()
}

test('a etapa que o garçom vai perguntar sobe para a tela', async ({ page }) => {
  await toMenu(page)
  await page.getByTestId('waiter-line').tap()
  // Escolher o pão pela voz deixa o PONTO DA CARNE como próxima pergunta.
  await page.getByTestId('waiter-input').fill('quero cheddar bacon com brioche')
  await page.getByTestId('waiter-send').tap()

  const body = page.getByTestId('sheet-body')
  await expect(body).toBeVisible()

  // A etapa pendente é a do PONTO DA CARNE — é o que a barra de baixo cobra.
  const step = page.locator('[data-step]').filter({ hasText: 'Ponto da carne' }).first()

  // A etapa perguntada tem de estar no TOPO da área de leitura, não apenas
  // "em algum lugar da tela": foi assim que o painel ficou perguntando o ponto
  // da carne com o cliente olhando o pão. Um quarto do sheet é a folga que o
  // próprio `scrollToStep` deixa acima do título.
  await expect
    .poll(async () => {
      const sheet = await body.boundingBox()
      const box = await step.boundingBox()
      if (!sheet || !box) return -1
      return Math.round(box.y - sheet.y)
    }, { timeout: 5000 })
    .toBeLessThan(250)
})
