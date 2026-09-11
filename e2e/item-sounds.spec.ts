import { expect, test, type Page } from '@playwright/test'

declare global { interface Window { __itemSoundFrequencies: number[] } }

async function recordSounds(page: Page) {
  await page.addInitScript(() => {
    const frequencies: number[] = []
    Object.defineProperty(window, '__itemSoundFrequencies', { value: frequencies })
    class FakeParam {
      setValueAtTime(value: number) { frequencies.push(value) }
      exponentialRampToValueAtTime() {}
    }
    class FakeNode { connect() { return this } }
    class FakeGain extends FakeNode { gain = new FakeParam() }
    class FakeOscillator extends FakeNode {
      type: OscillatorType = 'sine'; frequency = new FakeParam()
      start() {}; stop() {}
    }
    class FakeAudioContext {
      currentTime = 0; state: AudioContextState = 'running'; destination = new FakeNode()
      createGain() { return new FakeGain() }
      createOscillator() { return new FakeOscillator() }
      async resume() {}
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext })
  })
}

const starts = (page: Page) => page.evaluate(() => window.__itemSoundFrequencies.filter((frequency) => frequency === 220 || frequency === 300))

async function identify(page: Page, tenant: string) {
  await page.goto(`/?tenant=${tenant}`)
  for (const id of ['attract', 'mode-dine-in', 'identify-skip']) await page.getByTestId(id).tap()
}

test('burger reutiliza sons distintos para adicionar, retirar e recolocar', async ({ page }) => {
  await recordSounds(page); await identify(page, 'maxburger')
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await page.getByTestId('mod-mb-m-bacon').tap()
  await page.getByTestId('mod-mb-m-bacon').tap()
  await page.getByTestId('mod-mb-m-sem-cebola').tap()
  await page.getByTestId('mod-mb-m-sem-cebola').tap()
  expect(await starts(page)).toEqual([220, 220, 300, 300, 220])
})

test('pizza usa o mesmo feedback em sabores, extras e retirada da metade', async ({ page }) => {
  await recordSounds(page); await identify(page, 'pizza-house')
  await page.getByTestId('pizza-flavor-ph-p-calabresa').tap()
  await page.getByTestId('mod-ph-m-meio-4queijos').tap()
  await page.getByTestId('mod-ph-m-burrata').tap()
  await page.getByTestId('mod-ph-m-burrata').tap()
  await page.getByTestId('pizza-mode-whole').tap()
  expect(await starts(page)).toEqual([220, 220, 220, 300, 300])
})

test('áudio bloqueado nunca impede a escolha', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('blocked') } } }) })
  await identify(page, 'maxburger')
  await page.getByTestId('burger-recipe-mb-p-cheddar-bacon').tap()
  await expect(page.getByTestId('burger-recipe-mb-p-cheddar-bacon')).toHaveAttribute('aria-pressed', 'true')
})
