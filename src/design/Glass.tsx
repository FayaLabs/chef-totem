// ---------------------------------------------------------------------------
// A refração de borda.
//
// Vidro fosco é `backdrop-filter: blur()` e todo mundo já tem. O que faz uma
// peça parecer VIDRO é o que acontece nos três milímetros da quina: o que está
// atrás entorta, escorrega para fora e devolve um fio de luz. Sem isso a pane é
// um retângulo mais claro com a foto borrada dentro — dá para chamar de vidro,
// mas ninguém do outro lado do corredor de uma feira olha duas vezes.
//
// A CONTA. `feDisplacementMap` lê dois canais de uma imagem e usa cada pixel
// como um vetor: R decide o desvio horizontal, B o vertical, e 128 é o zero.
// Então o mapa abaixo é uma rampa que sai de 0 na borda esquerda, chega a 128
// e FICA em 128 por todo o miolo, e sobe até 255 na borda direita — o mesmo em
// pé, no canal azul.
//
// O miolo constante é a parte que importa, e é o que diferencia isto de um
// efeito de lente. Um mapa que varia de ponta a ponta entorta a pane inteira,
// inclusive a área onde o texto vai — e texto sobre fundo entortado é a versão
// bonita de texto ilegível. Aqui a distorção existe onde não há informação
// nenhuma, e o centro sai do filtro idêntico ao que entrou.
//
// POR QUE UM MAPA EM SVG e não uma imagem: o `liquid-glass-react` embute mapas
// prontos em JPEG base64 e gera um terceiro num canvas WebGL a cada montagem.
// Um gradiente em `data:` custa 700 bytes, não pede GPU para nascer, e escala
// com a pane sem uma segunda resolução. Num painel que precisa subir com a
// internet caída, o ativo que não existe é o ativo que não falha.
// ---------------------------------------------------------------------------

const RAMP = 0.14

/**
 * O mapa de deslocamento, como `data:`.
 *
 * `mix-blend-mode: screen` é o que junta as duas rampas sem uma pisar na
 * outra: a horizontal só tem vermelho, a vertical só tem azul, e screen de
 * canais disjuntos é a soma deles. Tentar o mesmo com duas camadas opacas dá o
 * gradiente de cima apagando o de baixo, e o vidro entorta só num eixo.
 */
const DISPLACEMENT_MAP = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="h" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#000000"/>` +
    `<stop offset="${RAMP}" stop-color="#7f0000"/>` +
    `<stop offset="${1 - RAMP}" stop-color="#7f0000"/>` +
    `<stop offset="1" stop-color="#ff0000"/>` +
    `</linearGradient>` +
    `<linearGradient id="v" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#000000"/>` +
    `<stop offset="${RAMP}" stop-color="#00007f"/>` +
    `<stop offset="${1 - RAMP}" stop-color="#00007f"/>` +
    `<stop offset="1" stop-color="#0000ff"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="200" height="200" fill="url(#h)"/>` +
    `<rect width="200" height="200" fill="url(#v)" style="mix-blend-mode:screen"/>` +
    `</svg>`,
)}`

/**
 * Os `defs` do vidro, montados uma vez no palco.
 *
 * Um `<filter>` por peça seria um por cartão, e um `id` duplicado num
 * documento é o tipo de bug em que metade das panes fica certa e a outra
 * metade não, dependendo da ordem de montagem.
 *
 * A ESCALA vem do tema e é lida do CSS em vez de vir por prop: `applyTheme`
 * roda antes da primeira pintura, então a variável já está lá — e assim a
 * espessura do vidro continua sendo uma propriedade da CASA, num arquivo só,
 * em vez de um número repetido em cada lugar que usa vidro.
 */
export function GlassDefs() {
  const scale =
    typeof window === 'undefined'
      ? 10
      : Number(
          getComputedStyle(document.documentElement).getPropertyValue('--glass-warp').trim(),
        ) || 10

  return (
    <svg
      aria-hidden
      focusable="false"
      // Fora da vista, mas NÃO `display: none`: um filtro dentro de um elemento
      // não renderizado é um filtro que o Chromium resolve como inexistente, e
      // o `url(#...)` que aponta para ele silenciosamente não faz nada.
      className="pointer-events-none absolute size-0 overflow-hidden"
    >
      <defs>
        {/* `sRGB` e não o `linearRGB` que é o padrão de SVG: o mapa foi
            desenhado em valores de tela, e linearizá-lo desloca o "zero" de
            128 para outro lugar — o miolo, que devia ficar parado, escorrega. */}
        <filter
          id="totem-glass-warp"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={DISPLACEMENT_MAP}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="MAP"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="MAP"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * A camada de vidro refratado, como primeiro filho de uma peça `.glass-media`.
 *
 * É um elemento de verdade e não um pseudo porque `filter` e `backdrop-filter`
 * têm de morar no MESMO nó, e esse nó não pode ser o botão: um `filter` no
 * botão entorta também o rótulo, que é a única coisa da peça que não pode
 * entortar.
 */
export function GlassWarp() {
  return <span aria-hidden className="glass-warp" />
}
