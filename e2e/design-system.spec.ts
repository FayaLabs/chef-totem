import { expect, test, type Page } from '@playwright/test'

// M1 — the primitives. These assert the two things that make a kiosk usable
// and that a designer cannot eyeball from a laptop: every target is at least
// the physical minimum, and every text pair clears WCAG AA.

/** Relative luminance per WCAG 2.1. */
const LUMINANCE = `(rgb) => {
  const [r, g, b] = rgb.match(/\\d+/g).slice(0, 3).map(Number).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}`

async function contrastOf(page: Page, selector: string): Promise<number> {
  return page.evaluate(
    ([sel, lumSrc]) => {
      const luminance = eval(lumSrc as string) as (rgb: string) => number
      const el = document.querySelector(sel as string)!
      const style = getComputedStyle(el)

      // Walk up for the first non-transparent background — the button's own
      // colour may be on an ancestor.
      let bgEl: Element | null = el
      let bg = 'rgba(0, 0, 0, 0)'
      while (bgEl) {
        const candidate = getComputedStyle(bgEl).backgroundColor
        if (candidate && !candidate.includes('rgba(0, 0, 0, 0)')) {
          bg = candidate
          break
        }
        bgEl = bgEl.parentElement
      }

      const a = luminance(style.color)
      const b = luminance(bg)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    },
    [selector, LUMINANCE] as const,
  )
}

test.describe('M1 · design system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?design')
    await expect(page.getByTestId('design-catalog')).toBeVisible()
  })

  test('todo alvo de toque tem pelo menos 88px', async ({ page }) => {
    // 88px is ~27mm at the panel's 82 DPI. The mobile 44px figure would be
    // 13mm here, under the 19mm kiosk standard.
    const targets = page.locator('button:not([aria-hidden])')
    const count = await targets.count()
    expect(count).toBeGreaterThan(10)

    const undersized: string[] = []
    for (let i = 0; i < count; i++) {
      const target = targets.nth(i)
      if (!(await target.isVisible())) continue
      const box = await target.boundingBox()
      if (!box) continue
      if (box.height < 88 || box.width < 88) {
        undersized.push(`${(await target.getAttribute('data-testid')) ?? (await target.innerText())} → ${Math.round(box.width)}x${Math.round(box.height)}`)
      }
    }
    expect(undersized, `alvos abaixo de 88px: ${undersized.join(', ')}`).toEqual([])
  })

  test('as teclas do teclado numérico têm 104px', async ({ page }) => {
    const box = await page.getByTestId('key-5').boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(104)
  })

  test('o texto passa em contraste AA', async ({ page }) => {
    // The red commit button is the one most likely to fail: #DC2626 on white
    // text is the pair everything else is judged against.
    // querySelector, not a Playwright locator: `:has-text()` is Playwright's
    // own syntax and means nothing to the DOM. Hence the testids.
    for (const [label, testid] of [
      ['vermelho de ação', 'btn-action'],
      ['preto', 'btn-ink'],
      ['saída discreta', 'btn-quiet'],
    ] as const) {
      const ratio = await contrastOf(page, `[data-testid="${testid}"]`)
      expect(ratio, `${label}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('o botão desabilitado é legível e não parece um botão aceso', async ({ page }) => {
    // A disabled state built from opacity on an accent colour gives a pale red
    // button: it still reads as "the red button", so customers keep tapping it,
    // and its label drops below AA. Disabled is a NEUTRAL here.
    const disabled = page.getByRole('button', { name: /escolha um tamanho/i })
    await expect(disabled).toBeDisabled()

    const ratio = await contrastOf(page, 'button[disabled]')
    expect(ratio, `rótulo desabilitado: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)

    const bg = await disabled.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg, 'desabilitado não pode ser o vermelho de ação lavado').not.toContain('220, 38, 38')
  })

  test('a borda de um controle vazado tem 3:1 contra a página', async ({ page }) => {
    // A white key on a near-white page has its border as the ONLY boundary,
    // so WCAG 1.4.11 applies to it. The old #E4E4E7 was 1.15:1 — invisible on
    // the panel, and doubly so under dining-room glare.
    const ratio = await page.evaluate(`${LUMINANCE.replace('(rgb) =>', 'const lum = (rgb) =>')}
      ;(() => {
        const key = document.querySelector('[data-testid="key-5"]')
        const border = getComputedStyle(key).borderTopColor
        const page = getComputedStyle(document.querySelector('[data-testid="design-catalog"]')).backgroundColor
        const a = lum(border), b = lum(page)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      })()`)
    expect(ratio as number, `borda: ${(ratio as number).toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
  })

  test('nada rola por baixo da barra inferior', async ({ page }) => {
    // Regression: the reach toggle used to float over the scrolling content,
    // so it always ended up covering something. A button hidden under another
    // button is the worst kind of broken — nothing about it looks wrong.
    await page.mouse.wheel(0, 4000)
    await page.waitForTimeout(200)

    const bar = (await page.getByTestId('bottom-bar').boundingBox())!
    for (const id of ['keypad', 'btn-open-sheet']) {
      const box = (await page.getByTestId(id).boundingBox())!
      expect(box.y + box.height, `${id} passa por baixo da barra`).toBeLessThanOrEqual(bar.y + 1)
    }
  })

  test('o modo acessível desce a UI sem encolher os alvos', async ({ page }) => {
    const normal = await page.getByTestId('key-5').boundingBox()
    const contentBefore = await page.locator('[data-totem-content]').boundingBox()

    await page.getByTestId('reach-toggle').tap()
    await expect(page.locator('[data-totem-stage]')).toHaveAttribute('data-reach', 'on')
    await page.waitForTimeout(400)

    const contentAfter = await page.locator('[data-totem-content]').boundingBox()
    // The content area gives up the top of the panel...
    expect(contentAfter!.y).toBeGreaterThan(contentBefore!.y + 500)

    // ...but the keys keep their physical size. Scaling the UI down would make
    // it harder to hit for exactly the person who turned this on.
    const reached = await page.getByTestId('key-5').boundingBox()
    expect(reached!.height).toBeCloseTo(normal!.height, 0)
  })

  test('o sheet abre, fecha no scrim e a fonte display é a self-hosted', async ({ page }) => {
    await page.getByTestId('btn-open-sheet').scrollIntoViewIfNeeded()
    await page.getByTestId('btn-open-sheet').tap()
    await expect(page.getByTestId('sheet')).toBeVisible()
    await page.getByTestId('sheet-scrim').tap()
    await expect(page.getByTestId('sheet')).toHaveCount(0)

    // Anton must be the resolved family, not an Impact fallback: the panel has
    // to look like itself with the internet down.
    const loaded = await page.evaluate(() => document.fonts.check('400 100px Anton'))
    expect(loaded).toBe(true)
  })

  test('o sheet fica por cima do botão de acessibilidade', async ({ page }) => {
    // The sheet is modal and anchored to the bottom edge, so it is already in
    // reach; a toggle floating over its commit bar is only a mis-tap waiting
    // to happen.
    await page.getByTestId('btn-open-sheet').scrollIntoViewIfNeeded()
    await page.getByTestId('btn-open-sheet').tap()
    await expect(page.getByTestId('sheet')).toBeVisible()

    // The sheet's scrim owns the toggle's pixels: it is modal, so nothing
    // behind it may be tapped by accident.
    const toggle = (await page.getByTestId('reach-toggle').boundingBox())!
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid') ?? '',
      [toggle.x + toggle.width / 2, toggle.y + toggle.height / 2] as const,
    )
    expect(onTop).not.toBe('reach-toggle')
  })
})

test.describe('M1 · sheet e tema', () => {
  test('arrastar o sheet para baixo fecha', async ({ page }) => {
    // Everyone arrives carrying a phone's muscle memory, and on a phone a
    // bottom sheet is dragged away. A panel that ignores the gesture people
    // already try reads as broken in front of a queue.
    await page.goto('/?design')
    await page.getByTestId('btn-open-sheet').scrollIntoViewIfNeeded()
    await page.getByTestId('btn-open-sheet').tap()
    await expect(page.getByTestId('sheet')).toBeVisible()

    const handle = (await page.getByTestId('sheet-handle').boundingBox())!
    const x = handle.x + handle.width / 2
    await page.mouse.move(x, handle.y + 10)
    await page.mouse.down()
    for (const dy of [50, 120, 200, 260]) await page.mouse.move(x, handle.y + 10 + dy)
    await page.mouse.up()

    await expect(page.getByTestId('sheet')).toHaveCount(0)
  })

  test('um arrasto curto volta, não fecha', async ({ page }) => {
    // Otherwise a customer who brushes the sheet while reaching for a chip
    // loses their place.
    await page.goto('/?design')
    await page.getByTestId('btn-open-sheet').scrollIntoViewIfNeeded()
    await page.getByTestId('btn-open-sheet').tap()

    const handle = (await page.getByTestId('sheet-handle').boundingBox())!
    const x = handle.x + handle.width / 2
    await page.mouse.move(x, handle.y + 10)
    await page.mouse.down()
    await page.mouse.move(x, handle.y + 50)
    await page.mouse.up()
    await page.waitForTimeout(300)

    await expect(page.getByTestId('sheet')).toBeVisible()
  })

  test('um tema de tenant que reprova em contraste é denunciado', async ({ page }) => {
    // A restaurant picking their brand colour is not thinking about a dining
    // room at 2pm by the window. "Our red is a bit lighter" is how a Pagar
    // button becomes unreadable.
    await page.goto('/?design')
    const warnings = await page.evaluate(async () => {
      const { checkTheme, defaultTheme } = await import('/src/design/theme.ts')
      return checkTheme({ ...defaultTheme, action: '#FF9AA2', edge: '#F2F2F3' }).map((w) => w.token)
    })
    expect(warnings).toContain('action')
    expect(warnings).toContain('edge')
  })
})
