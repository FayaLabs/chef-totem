import { expect, test, type Page } from '@playwright/test'

// A escolha empurra a tela para a etapa seguinte, e a foto do burger é o botão
// que abre as camadas. As duas coisas existem pelo mesmo motivo: num totem
// ninguém rola por curiosidade nem procura ícone — a tela tem que se oferecer.

async function openBurger(page: Page) {
  await page.goto('/?tenant=maxburger')
  await page.getByTestId('attract').tap()
  await page.getByTestId('mode-dine-in').tap()
  await page.getByTestId('identify-skip').tap()
  await expect(page.getByTestId('burger-preview')).toBeVisible()
}

const scrollTop = (page: Page) =>
  page.getByTestId('product-sheet').getByTestId('sheet-body').evaluate((e) => e.scrollTop)

/** A rolagem é suave e começa alguns quadros depois do toque: medir cedo mede
 * a tela parada de antes, e medir no meio mede a do meio do caminho. */
async function settled(page: Page) {
  await page.waitForTimeout(250)
  return page.getByTestId('product-sheet').getByTestId('sheet-body').evaluate((element) =>
    new Promise<number>((resolve) => {
      let last = element.scrollTop
      let still = 0
      const tick = () => {
        if (element.scrollTop === last) still += 1
        else { still = 0; last = element.scrollTop }
        if (still >= 20) resolve(element.scrollTop)
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }))
}

test('cada etapa escolhida desce a lista até a próxima em aberto', async ({ page }, info) => {
  await openBurger(page)
  const body = page.getByTestId('product-sheet').getByTestId('sheet-body')
  expect(await scrollTop(page)).toBe(0)

  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  expect(await settled(page)).toBeGreaterThan(0)

  // Descer é levar a etapa para o topo da área de leitura, não dar um pulo
  // qualquer: encostada na borda ela lê como texto cortado pelo topo, e a
  // folga é de 2% da largura do sheet, nada além disso.
  //
  // Escolher o lanche para no PÃO mesmo com o pão já marcado pela receita: é a
  // etapa seguinte, e o cliente precisa ver qual pão levou para poder trocar.
  const nearTop = async (step: string) => {
    const top = (await body.boundingBox())!.y
    const y = (await page.locator('[data-step]').filter({ hasText: step }).first().boundingBox())!.y
    expect(y).toBeGreaterThanOrEqual(top)
    expect(y - top).toBeLessThan(40)
  }
  await nearTop('O pão')

  const afterBread = await scrollTop(page)
  await page.getByTestId('mod-mb-m-australiano').tap()
  expect(await settled(page)).toBeGreaterThan(afterBread)
  await page.screenshot({ path: info.outputPath('step-flow-ponto.png') })

  // Escolha única enche no primeiro toque. "Ponto da carne" não chega a
  // encostar no topo porque a lista já está no fim do seu curso — o que a
  // etapa precisa é estar INTEIRA na tela, e está.
  const point = page.locator('[data-step]').filter({ hasText: 'Ponto da carne' }).first()
  const frame = (await body.boundingBox())!
  const seen = (await point.boundingBox())!
  expect(seen.y).toBeGreaterThanOrEqual(frame.y)
  expect(seen.y + seen.height).toBeLessThanOrEqual(frame.y + frame.height + 1)
  await expect(point.getByTestId(/step-heading-/)).toContainText('Escolha 1')
})

test('tirar uma escolha não arrasta a tela, e o grupo com vaga sobrando fica', async ({ page }) => {
  await openBurger(page)
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-australiano').tap()
  await page.getByTestId('mod-mb-m-ponto').tap()
  await page.getByTestId('mod-mb-m-ovo').scrollIntoViewIfNeeded()
  const parked = await scrollTop(page)
  await page.getByTestId('mod-mb-m-ovo').tap()      // adicional com vaga sobrando
  await page.waitForTimeout(500)
  expect(await scrollTop(page)).toBeCloseTo(parked, 0)
  await page.getByTestId('mod-mb-m-ovo').tap()      // desmarcar nunca move
  await page.waitForTimeout(500)
  expect(await scrollTop(page)).toBeCloseTo(parked, 0)
})

test('tocar na foto do burger abre as camadas, e elas ficam abertas', async ({ page }) => {
  await openBurger(page)
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('burger-photo-toggle').tap()
  await expect(page.getByTestId('burger-stage')).toHaveAttribute('data-open', 'false')

  await page.getByTestId('burger-photo-expand').tap()
  await expect(page.getByTestId('burger-stage')).toHaveAttribute('data-open', 'true')
  // O toque é deliberado: ele cancela o fechamento automático da prévia.
  await page.waitForTimeout(3200)
  await expect(page.getByTestId('burger-stage')).toHaveAttribute('data-open', 'true')
})
