import assert from 'node:assert/strict'
import { afterEach, test } from 'vitest'
import { activeDemoTenant, activeSelection, isDemoCatalog, SELECTION_KEY } from '../src/demo/mode'

// ---------------------------------------------------------------------------
// A ordem de precedência do seletor de casa.
//
// Três jeitos de escolher um restaurante (link, toque, `.env`) é exatamente o
// número em que a ordem entre eles deixa de ser óbvia — e errar aqui não dá
// erro nenhum: dá um painel que abre na casa errada numa feira, e ninguém
// consegue dizer por quê olhando para a tela.
//
// O caso que estes testes existem para travar é o do e2e: um teste que abre
// `/?tenant=maxburger` não pode depender do que a execução anterior deixou no
// armazenamento. Por isso a URL ganha do toque, e não o contrário.
// ---------------------------------------------------------------------------

/** Um `window` de mentirinha — o suficiente para o módulo, e nada mais. */
function stubWindow(search: string, stored?: string | null, storageThrows = false) {
  const store = new Map<string, string>()
  if (stored) store.set(SELECTION_KEY, stored)

  ;(globalThis as { window?: unknown }).window = {
    location: { search, href: `http://totem.local/${search}` },
    localStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error('storage bloqueado')
        return store.get(key) ?? null
      },
      setItem: (key: string, value: string) => {
        if (storageThrows) throw new Error('storage bloqueado')
        store.set(key, value)
      },
    },
  }
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

test('sem escolha nenhuma, o padrão do aparelho vale', () => {
  stubWindow('')
  assert.equal(activeSelection(), null)
  // Sem `VITE_TOTEM_CATALOG=demo` no ambiente do teste, o painel é ao vivo.
  assert.equal(isDemoCatalog(), false)
  // E a casa padrão continua existindo, para quando o `.env` ligar o demo.
  assert.equal(activeDemoTenant().id, 'pizza-house')
})

test('a URL escolhe a casa e liga o modo demonstração junto', () => {
  // As duas coisas são uma só de propósito: pintar a marca da hamburgueria por
  // cima do cardápio do cliente real seria um totem mentindo sobre onde o
  // pedido vai cair.
  stubWindow('?tenant=maxburger')
  assert.equal(activeSelection(), 'maxburger')
  assert.equal(isDemoCatalog(), true)
  assert.equal(activeDemoTenant().brand.name, 'MaxBurger')
})

test('o que foi tocado no painel sobrevive ao reload', () => {
  stubWindow('', 'cafe-sabor')
  assert.equal(activeSelection(), 'cafe-sabor')
  assert.equal(activeDemoTenant().brand.name, 'Café Sabor')
})

test('a URL ganha do que ficou guardado', () => {
  // O caso do e2e: `/?tenant=pizza-house` tem de abrir a pizzaria mesmo que a
  // execução anterior tenha deixado a hamburgueria no armazenamento.
  stubWindow('?tenant=pizza-house', 'maxburger')
  assert.equal(activeSelection(), 'pizza-house')
  assert.equal(activeDemoTenant().brand.name, 'Pizza House')
})

test('"ao vivo" desliga a demonstração mesmo vindo do armazenamento', () => {
  // O caminho de volta. Sem ele, um painel trocado numa feira volta para o
  // cliente real com a marca errada.
  stubWindow('', 'live')
  assert.equal(activeSelection(), 'live')
  assert.equal(isDemoCatalog(), false)
})

test('um id que não existe é ignorado, não quebra a tela', () => {
  // `?tenant=zedek` continua existindo em link antigo e em print de slide.
  stubWindow('?tenant=zedek', null)
  assert.equal(activeSelection(), null)
  assert.equal(activeDemoTenant().id, 'pizza-house')
})

test('armazenamento bloqueado deixa o seletor esquecido, não quebrado', () => {
  // Janela anônima, política de dispositivo. O painel tem de subir.
  stubWindow('', 'maxburger', true)
  assert.equal(activeSelection(), null)
  assert.equal(activeDemoTenant().id, 'pizza-house')
})
