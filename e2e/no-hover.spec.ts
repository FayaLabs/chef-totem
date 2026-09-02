import { expect, test } from '@playwright/test'

// Hover does not exist on a touch panel: a :hover rule latches onto the last
// element a finger touched and stays lit, which reads as a stuck selection
// nothing clears. This asserts the rule against the SOURCE, because the only
// way to catch it is before it ships.
test('nenhum estilo :hover no código do totem', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs')
  const { join, resolve } = await import('node:path')

  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.(tsx?|css)$/.test(entry)) continue
      // Comments are stripped first: the file that documents WHY hover is
      // banned kept tripping the detector that enforces it.
      const source = readFileSync(full, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      source.split('\n').forEach((line, index) => {
        if (/hover:|:hover/.test(line)) offenders.push(`${entry}:${index + 1}`)
      })
    }
  }
  walk(resolve(process.cwd(), 'src'))

  expect(offenders, `estados de hover encontrados: ${offenders.join(', ')}`).toEqual([])
})
