import { expect, test, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// O painel de serviço (src/demo/TenantSwitcher.tsx).
//
// O que ele tem de entregar, e é onde os testes moram:
//
//   1. NÃO COMPETIR COM O PEDIDO. O painel inteiro é o botão de começar, e a
//      etiqueta do canto não pode roubar o toque de quem só quer comprar.
//   2. TROCAR DE CASA DE VERDADE — marca E design, não só o nome no topo.
//   3. DIZER O QUE ESTE APARELHO É. Quem conserta um totem está de pé na frente
//      dele: se a tela não diz o modo e o tenant, a resposta é ligar para
//      alguém que abra um terminal.
// ---------------------------------------------------------------------------

async function openPanel(page: Page) {
  // A etiqueta da build É o gatilho. Ver TotemViewport: houve uma versão com um
  // alvo próprio logo abaixo dela, e quem operava o painel tocava na etiqueta
  // que via — esta — sem nada acontecer.
  await page.getByTestId('totem-release').tap()
}

test.describe('seletor de casa', () => {
  test('a etiqueta do canto não rouba o toque de quem vai pedir', async ({ page }) => {
    // O painel inteiro é o botão de começar. Um alvo de serviço no canto que
    // engolisse o toque do cliente seria pior do que não existir.
    await page.goto('/')
    await page.getByTestId('attract').tap()
    await expect(page.getByTestId('screen-mode')).toBeVisible()
    await expect(page.getByTestId('tenant-switcher')).toHaveCount(0)
  })

  test('a etiqueta diz a casa no ar sem ninguém tocar em nada', async ({ page }) => {
    // De longe, numa feira, a pergunta é "em qual está agora?". A resposta tem
    // de estar na tela antes de qualquer toque.
    await page.goto('/?tenant=maxburger')
    await expect(page.getByTestId('totem-release')).toContainText('MaxBurger')
  })

  test('a etiqueta abre a lista com as três casas e a volta para o ao vivo', async ({ page }) => {
    // Entra por link e não por `/`: o servidor de desenvolvimento local pode
    // estar ligado no cardápio AO VIVO, e um teste que depende do `.env` da
    // máquina de quem roda falha por um motivo que não é o dele.
    await page.goto('/?tenant=pizza-house')
    await openPanel(page)

    const sheet = page.getByTestId('tenant-switcher')
    await expect(sheet).toBeVisible()
    for (const id of ['cafe-sabor', 'pizza-house', 'maxburger', 'live']) {
      await expect(page.getByTestId(`tenant-option-${id}`)).toBeVisible()
    }

    // A casa no ar aparece marcada. Sem isso o operador não sabe onde está.
    await expect(page.getByTestId('tenant-option-pizza-house')).toHaveAttribute('aria-pressed', 'true')
  })

  test('trocar de casa troca a marca e o design junto', async ({ page }) => {
    await page.goto('/?tenant=pizza-house')
    await expect(page.getByTestId('brand-logo')).toHaveAccessibleName('Pizza House')

    const pizza = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const get = (name: string) => root.getPropertyValue(name).trim()
      return {
        onAction: get('--color-on-action'),
        shadow: get('--shadow-card'),
        page: get('--color-page'),
        display: get('--font-display'),
        glass: `${get('--glass-blur')}|${get('--glass-pane')}`,
      }
    })

    await openPanel(page)
    await page.getByTestId('tenant-option-maxburger').tap()

    // A troca recarrega o painel (o tema é pintado antes do primeiro quadro).
    await expect(page.getByTestId('brand-logo')).toHaveAccessibleName('MaxBurger')
    await expect(page.getByTestId('attract')).toContainText('Toque e monte o seu')

    // E o DESIGN foi junto. Se só a cópia tivesse trocado, isto passaria — e a
    // demonstração seria uma troca de textos com a mesma cara.
    //
    // As três medidas eram VALORES FIXOS da lanchonete de antes: `#171717`,
    // `0.4cqw 0.4cqw 0` e o creme `#FEF3C7`. Os três morreram no dia em que a
    // casa deixou de ser vintage — página fria, elevação de vidro, tinta um
    // grau mais fria — e o teste ficou vermelho medindo uma casa que não existe
    // mais. Pinar o hex de um tenant num teste de TROCA é medir a decoração de
    // uma das casas em vez de medir a troca.
    //
    // Agora ele compara as duas pontas: o que estava pintado antes da troca e o
    // que ficou depois. Isso reprova exatamente o que tem de reprovar — uma
    // troca que só mexe no texto — e sobrevive a qualquer redesenho de
    // qualquer casa, que é o que este painel existe para permitir.
    const read = () =>
      page.evaluate(() => {
        const root = getComputedStyle(document.documentElement)
        const get = (name: string) => root.getPropertyValue(name).trim()
        return {
          onAction: get('--color-on-action'),
          shadow: get('--shadow-card'),
          page: get('--color-page'),
          display: get('--font-display'),
          glass: `${get('--glass-blur')}|${get('--glass-pane')}`,
        }
      })

    const burger = await read()
    for (const [token, before, after] of [
      ['tinta do commit', pizza.onAction, burger.onAction],
      ['sombra do cartão', pizza.shadow, burger.shadow],
      ['cor da página', pizza.page, burger.page],
      ['fonte do display', pizza.display, burger.display],
      ['vidro', pizza.glass, burger.glass],
    ] as const) {
      expect(after, `${token} não mudou ao trocar de casa`).not.toBe(before)
    }
    // E a tinta sobre o amarelo do commit continua sendo ESCURA, que é o caso
    // que prova sozinho por que `onAction` é um token: branco fixo aqui daria
    // 1,7:1 e um botão de PAGAR ilegível.
    expect(Number.parseInt(burger.onAction.replace('#', '').slice(0, 2), 16)).toBeLessThan(0x40)

    // E a escolha sobrevive a uma abertura LIMPA, sem parâmetro nenhum na URL
    // — que é o que permite deixar o painel ligado numa casa o dia inteiro e
    // reiniciá-lo sem ter de lembrar de nada.
    await page.goto('/')
    await expect(page.getByTestId('brand-logo')).toHaveAccessibleName('MaxBurger')
  })

  test('a URL abre direto numa casa, sem passar pelo seletor', async ({ page }) => {
    // O link que alguém manda antes da feira, e o caminho que estes testes
    // usam. Ele ganha do que ficou guardado de propósito.
    await page.goto('/?tenant=cafe-sabor')
    await expect(page.getByTestId('brand-logo')).toHaveAccessibleName('Café Sabor')

    // A cafeteria é a única que NÃO escreve o título em caixa alta — é o token
    // de tipografia da marca, e é o que prova que o design system é por casa.
    const displayCase = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--display-case').trim(),
    )
    expect(displayCase).toBe('none')
  })

  test('o painel diz em que modo e em que casa o aparelho está', async ({ page }) => {
    // A tela que evita um telefonema. "Não está pegando o cardápio" tem quatro
    // causas, e as quatro se distinguem aqui.
    await page.goto('/?tenant=maxburger')
    await openPanel(page)
    const debug = page.getByTestId('tenant-debug')
    await expect(debug).toContainText('demonstração')
    await expect(debug).toContainText('MaxBurger')
    await expect(debug).toContainText('url')
    // E nunca um segredo: o painel fica virado para um salão.
    await expect(debug).not.toContainText(/senha|password|sb_secret|service_role/i)
  })

  test('o painel de serviço só aparece no repouso', async ({ page }) => {
    // A etiqueta acompanhava todas as telas. No cardápio, na identificação e no
    // pagamento o topo é a parte que o cliente lê primeiro, e um rótulo de
    // suporte ali cobra espaço de TODO cliente para servir um operador três
    // vezes por feira. No repouso o espaço é de graça.
    await page.goto('/?tenant=pizza-house')
    await expect(page.getByTestId('totem-release')).toBeVisible()

    await page.getByTestId('attract').tap()
    await expect(page.getByTestId('screen-mode')).toBeVisible()
    await expect(page.getByTestId('totem-release')).toHaveCount(0)
  })
})
