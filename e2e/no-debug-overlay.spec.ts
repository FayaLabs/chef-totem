import { expect, test } from '@playwright/test'

test('o painel não mostra diagnóstico para quem passa', async ({ page }) => {
  // O medidor de quadros é ferramenta de medição. Aceso num corredor de feira,
  // o que ele diz para quem passa é "isto aqui é um protótipo".
  await page.goto('/?tenant=maxburger')
  await expect(page.getByTestId('attract')).toBeVisible()
  await expect(page.getByTestId('fps-meter')).toHaveCount(0)
})

test('e continua ao alcance de quem for medir', async ({ page }) => {
  await page.goto('/?tenant=maxburger&fps')
  await expect(page.getByTestId('fps-meter')).toBeVisible()
})
