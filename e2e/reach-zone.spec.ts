import { expect, test, type Page } from '@playwright/test'

// DESIGN.md: the PRIMARY path lives below 40% of the panel height. The top is a
// shop window — photo, headline, brand. On a 27" panel mounted at kiosk height
// the top third is out of comfortable reach for a shorter customer and out of
// any reach for someone seated.
//
// Secondary controls (a type selector, a filter) may sit higher: reach mode
// exists to bring everything down for whoever needs it. What must never sit up
// there is the button that moves the order forward.

const REACH_LINE = 0.4

async function primaryIsInReach(page: Page, testIds: string[], screen: string) {
  const stage = (await page.locator('[data-totem-stage]').boundingBox())!
  const limit = stage.y + stage.height * REACH_LINE

  const tooHigh: string[] = []
  for (const id of testIds) {
    const box = await page.getByTestId(id).boundingBox()
    if (!box) continue
    if (box.y < limit) tooHigh.push(`${id} @ ${Math.round(((box.y - stage.y) / stage.height) * 100)}%`)
  }
  expect(tooHigh, `${screen}: controle primário acima da linha de alcance → ${tooHigh.join(', ')}`).toEqual([])
}

test.describe('zona de alcance', () => {
  test('modo de consumo', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await primaryIsInReach(page, ['mode-dine-in', 'mode-takeaway'], 'mode')
  })

  test('identificação', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await primaryIsInReach(page, ['keypad', 'identify-skip', 'identify-confirm'], 'identify')
  })
})
