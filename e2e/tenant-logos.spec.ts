import { expect, test } from '@playwright/test'

test('cada loja tem sua logo carregada, identificada e dentro do painel', async ({ page }) => {
  const sources: string[] = []
  for (const [id, name] of [['pizza-house', 'Pizza House'], ['maxburger', 'MaxBurger'], ['cafe-sabor', 'Café Sabor']]) {
    await page.goto(`/?tenant=${id}`)
    const logo = page.getByTestId('brand-logo')
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAccessibleName(name)
    await expect.poll(() => logo.evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0)).toBe(true)
    const bounds = (await logo.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(1080)
    sources.push((await logo.getAttribute('src'))!)
    await page.getByTestId('attract').tap()
    await expect(page.getByTestId('mode-dine-in')).toBeVisible()
  }
  expect(new Set(sources).size).toBe(3)
})

test('se a logo falhar, o nome da loja permanece e o atendimento começa', async ({ page }) => {
  await page.route('**/demo/*/logo*', (route) => route.abort())
  await page.goto('/?tenant=pizza-house')
  await expect(page.getByTestId('brand-logo')).toHaveCount(0)
  await expect(page.getByTestId('attract')).toContainText('Pizza House')
  await page.getByTestId('attract').tap()
  await expect(page.getByTestId('mode-dine-in')).toBeVisible()
})
