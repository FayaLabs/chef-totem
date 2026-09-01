import { expect, test, type Page } from '@playwright/test'

// This exact bug happened twice: in M1 the floating reach toggle covered the
// keypad, and in M2 the bottom bar covered the identify screen's own buttons.
// A control hidden under another control is the worst kind of broken — nothing
// about it looks wrong, it just does not respond.
//
// So it stops being something I catch by staring at screenshots.

async function everyTargetIsClickable(page: Page, screen: string) {
  const buttons = page.locator('button:visible')
  const count = await buttons.count()
  const buried: string[] = []

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i)
    const box = await button.boundingBox()
    if (!box) continue

    // Scrolled out of its container is not the same as buried: elementFromPoint
    // at an off-screen centre reports whatever is painted there instead.
    const size = page.viewportSize()!
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    if (cx < 0 || cy < 0 || cx > size.width || cy > size.height) continue

    // Whatever is painted at the centre of this control must BE this control
    // (or a child of it). Anything else means something is sitting on top.
    const covered = await button.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return top ? !el.contains(top) && top !== el : true
    })
    if (covered) {
      buried.push((await button.getAttribute('data-testid')) ?? (await button.innerText()).slice(0, 24))
    }
  }
  expect(buried, `${screen}: controles cobertos por outro elemento → ${buried.join(', ')}`).toEqual([])
}

test.describe('nenhum controle fica enterrado sob outro', () => {
  test('attract', async ({ page }) => {
    await page.goto('/')
    await everyTargetIsClickable(page, 'attract')
  })

  test('modo de consumo', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await everyTargetIsClickable(page, 'mode')
  })

  test('identificação', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await page.getByTestId('mode-dine-in').tap()
    await everyTargetIsClickable(page, 'identify')
  })

  test('catálogo de design, rolado até o fim', async ({ page }) => {
    await page.goto('/?design')
    await page.mouse.wheel(0, 4000)
    await page.waitForTimeout(200)
    await everyTargetIsClickable(page, 'design')
  })
})
