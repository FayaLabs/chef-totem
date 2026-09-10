import { expect, type Page } from '@playwright/test'

/** Legacy menu tests deliberately dismiss the new one-time pizza introduction. */
export async function dismissPizzaIntro(page: Page) {
  await expect(page.getByTestId('pizza-composer')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('product-sheet')).toHaveCount(0)
}
