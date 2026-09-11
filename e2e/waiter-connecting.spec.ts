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
  await expect(page.getByTestId('waiter-connecting')).toBeVisible()
  await expect(page.getByTestId('waiter-line-text')).toContainText(/chamando/i)
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
    await expect(page.getByTestId('talk-stop')).toBeVisible()
  }

  await page.getByTestId('talk-button').tap()
  await expect(page.getByTestId('waiter-dock')).toHaveAttribute('data-phase', 'idle')
  await expect(page.getByTestId('waiter-connecting')).toHaveCount(0)
})

test('parado, o botão volta a ser o microfone', async ({ page }) => {
  await toMenu(page)
  await expect(page.getByTestId('talk-button')).toHaveAttribute('data-action', 'start')
  await expect(page.getByTestId('talk-stop')).toHaveCount(0)
})
