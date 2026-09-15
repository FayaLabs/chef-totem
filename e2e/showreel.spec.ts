import { expect, test } from '@playwright/test'

// A apresentação automática: o painel se mostrando sozinho num corredor de
// feira. O que este teste cobra é o que não pode falhar em público — ela anda,
// ela NÃO paga, e o primeiro toque devolve o painel ao cliente.

test('ela anda sozinha pelas telas', async ({ page }) => {
  await page.goto('/?showreel=1&tenant=maxburger')
  // Sai do repouso sem ninguém tocar em nada.
  await expect(page.getByTestId('screen-menu')).toBeVisible({ timeout: 20_000 })
  // E segue até a conta — o ponto alto da volta.
  await expect(page.getByTestId('screen-payment')).toBeVisible({ timeout: 30_000 })
})

test('o dedo do cliente encerra a apresentação e o painel vira dele', async ({ page }) => {
  await page.goto('/?showreel=1&tenant=maxburger')
  await expect(page.getByTestId('screen-menu')).toBeVisible({ timeout: 20_000 })

  // Um dedo em qualquer lugar do vidro, como o de quem chegou na frente do
  // painel — não um clique num alvo escolhido pelo teste.
  await page.touchscreen.tap(30, 500)

  await expect
    .poll(async () => page.evaluate(() => (window as any).fayzShowreel?.running?.()), { timeout: 10_000 })
    .toBe(false)

  // O mesmo toque que parou a demonstração já começa a visita: quem encostou
  // no painel não devia ter de encostar de novo para ser atendido.
  await expect(page.getByTestId('screen-mode').or(page.getByTestId('attract'))).toBeVisible()

  // E ela NÃO volta por cima de quem chegou.
  await page.waitForTimeout(3000)
  expect(await page.evaluate(() => (window as any).fayzShowreel?.running?.())).toBe(false)
})

test('ninguém paga: a volta não fecha pedido', async ({ page }) => {
  const posted: string[] = []
  await page.route('**/functions/v1/**', (route) => {
    posted.push(route.request().url())
    return route.abort()
  })
  await page.goto('/?showreel=1&tenant=maxburger')
  await expect(page.getByTestId('screen-payment')).toBeVisible({ timeout: 30_000 })
  // Uma volta inteira sem uma única chamada de pedido ao cluster.
  expect(posted.filter((url) => url.includes('public-booking'))).toEqual([])
})
