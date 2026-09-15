import { expect, test } from '@playwright/test'

// A apresentação automática: o painel se mostrando sozinho num corredor de
// feira. O que este teste cobra é o que não pode falhar em público — ela anda,
// ela NÃO paga, e o primeiro toque devolve o painel ao cliente.

test('ela anda sozinha pelas telas', async ({ page }) => {
  await page.goto('/?showreel=1&tenant=maxburger')
  // Sai do repouso sem ninguém tocar em nada.
  await expect(page.getByTestId('screen-menu')).toBeVisible({ timeout: 30_000 })
  // E segue até a conta — o ponto alto da volta.
  await expect(page.getByTestId('screen-payment')).toBeVisible({ timeout: 90_000 })
})

test('o dedo do cliente encerra a apresentação e o painel vira dele', async ({ page }) => {
  await page.goto('/?showreel=1&tenant=maxburger')
  await expect(page.getByTestId('screen-menu')).toBeVisible({ timeout: 30_000 })

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
  await expect(page.getByTestId('screen-payment')).toBeVisible({ timeout: 90_000 })
  // Uma volta inteira sem uma única chamada de pedido ao cluster.
  expect(posted.filter((url) => url.includes('public-booking'))).toEqual([])
})

test('a volta troca de casa: burger e pizza, que são as que montam na tela', async ({ page }) => {
  // Uma volta inteira leva ~50 s de propósito (é vitrine, não operação), e a
  // troca só acontece no fim dela — o limite padrão de 60 s do Playwright não
  // cabe nisso.
  test.setTimeout(180_000)
  await page.goto('/?showreel=1&tenant=maxburger')
  // Uma volta inteira na MaxBurger e a seguinte já é a pizzaria — a troca
  // recarrega o painel, e a apresentação volta sozinha do outro lado.
  await expect
    .poll(async () => new URL(page.url()).searchParams.get('tenant'), { timeout: 120_000 })
    .toBe('pizza-house')
  await expect(page.getByTestId('attract').or(page.getByTestId('screen-mode'))).toBeVisible({ timeout: 20_000 })
})

test('parado no repouso, o painel começa a se apresentar sozinho', async ({ page }) => {
  // `showreel-idle` em segundos: o padrão do painel é 90, que um teste não
  // espera. A regra é a mesma.
  await page.goto('/?tenant=maxburger&showreel-idle=3')
  await expect(page.getByTestId('attract')).toBeVisible()

  await expect
    .poll(async () => page.evaluate(() => (window as any).fayzShowreel?.running?.()), { timeout: 15_000 })
    .toBe(true)
})

test('quem está pedindo não é interrompido pela vitrine', async ({ page }) => {
  await page.goto('/?tenant=maxburger&showreel-idle=3')
  await page.getByTestId('attract').tap()
  await expect(page.getByTestId('screen-mode')).toBeVisible()

  // Fora do repouso a contagem não vale: a tela é de quem está decidindo.
  await page.waitForTimeout(6000)
  expect(await page.evaluate(() => (window as any).fayzShowreel?.running?.())).toBe(false)
  await expect(page.getByTestId('screen-mode')).toBeVisible()
})
