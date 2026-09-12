import { expect, test, type Page } from '@playwright/test'
import { dismissPizzaIntro } from './pizza-helpers'

// A sessão de voz não sobe num teste — ela pede microfone, token e rede. O que
// ESTE teste prova é a única parte que o cliente vê e que não dependia disso: o
// painel diz que está carregando, e o mesmo botão derruba a sessão.

async function toMenu(page: Page) {
  await page.goto('/?waiter=scripted')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await dismissPizzaIntro(page)
  await expect(page.getByTestId('waiter-dock')).toBeVisible()
}

const setPhase = (page: Page, phase: string) =>
  page.evaluate((value) => {
    ;(window as any).__waiter.getState().setPhase(value)
  }, phase)

test('abrir a sessão aparece na faixa, em vez de silêncio', async ({ page }) => {
  await toMenu(page)
  await setPhase(page, 'connecting')

  await expect(page.getByTestId('waiter-dock')).toHaveAttribute('data-phase', 'connecting')
  await expect(page.getByTestId('waiter-line-text')).toContainText(/chamando/i)
  // Quem carrega o "está carregando" é o orbe, no estado de trabalho da lib.
  await expect(page.getByTestId('voice-orb').first()).toHaveAttribute('data-phase', 'connecting')
  // Parar tem nome e mora fora do orbe.
  await expect(page.getByTestId('waiter-stop')).toBeVisible()
})

test('o mesmo botão derruba a sessão enquanto ela conecta, pensa ou fala', async ({ page }) => {
  await toMenu(page)

  for (const phase of ['connecting', 'thinking', 'speaking']) {
    await setPhase(page, phase)
    const button = page.getByTestId('talk-button')
    // Desabilitado era o defeito: uma sessão que começava a falar besteira só
    // parava fechando a aplicação.
    await expect(button).toBeEnabled()
    await expect(button).toHaveAttribute('data-action', 'end')
    // O orbe nunca carrega glifo: quem para tem nome, e fica no canto oposto.
    await expect(page.getByTestId('waiter-stop')).toBeVisible()
  }

  await page.getByTestId('waiter-stop').tap()
  await expect(page.getByTestId('waiter-dock')).toHaveAttribute('data-phase', 'idle')
  await expect(page.getByTestId('voice-orb').first()).toHaveAttribute('data-phase', 'idle')
})

test('com uma folha aberta, a faixa sobe para o topo', async ({ page }) => {
  await toMenu(page)
  await setPhase(page, 'speaking')
  const dock = page.getByTestId('waiter-dock')
  const embaixo = (await dock.boundingBox())!

  await page.locator('button[data-testid^=product-]:not([disabled])').first().tap()
  await page.getByTestId('sheet-handle').waitFor()
  await expect.poll(async () => (await dock.boundingBox())!.y).toBeLessThan(10)

  // E não encosta na folha: ela para em 86% da tela, e a faixa cabe inteira na
  // banda que sobra. Uma faixa por baixo da folha é uma conversa que sumiu.
  const noTopo = (await dock.boundingBox())!
  const folha = (await page.locator('[data-sheet-open] [role=dialog]').first().boundingBox())!
  expect(noTopo.y + noTopo.height).toBeLessThanOrEqual(folha.y)

  await page.keyboard.press('Escape')
  await expect.poll(async () => (await dock.boundingBox())!.y).toBeGreaterThan(embaixo.y - 1)
})

test('parado, o botão volta a ser o microfone', async ({ page }) => {
  await toMenu(page)
  await expect(page.getByTestId('talk-button')).toHaveAttribute('data-action', 'start')
  await expect(page.getByTestId('waiter-stop')).toHaveCount(0)
})
