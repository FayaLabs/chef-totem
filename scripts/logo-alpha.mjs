#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Tira o preto de uma logo gerada e devolve alfa de verdade.
//
// Nenhum modelo de imagem bom em TIPOGRAFIA gera fundo transparente: os que
// geram vetor erram menos no texto mas escolhem a cor por conta própria, e os
// que acertam o texto entregam um retângulo opaco. A saída é pedir a logo sobre
// PRETO PURO e recuperar o alfa aqui.
//
// A alternativa era `mix-blend-mode: screen` no CSS, e ela funciona — enquanto
// o fundo for escuro. O pôster da cafeteria é uma sala clara de manhã, e ali o
// `screen` apaga a logo inteira. Um recurso que funciona em duas das três casas
// não é um recurso, é uma armadilha esperando a terceira.
//
// O canal alfa vem do canal mais claro do pixel, e a cor é DESPREMULTIPLICADA
// (dividida pelo alfa) para voltar ao tom cheio. Sem isso a logo fica correta
// sobre preto e cinzenta sobre qualquer outra coisa — que é o mesmo defeito do
// `screen`, só que assado no arquivo.
//
//   node scripts/logo-alpha.mjs entrada.png saida.png
// ---------------------------------------------------------------------------
import { execFileSync } from 'node:child_process'

const [input, output, floor = '14'] = process.argv.slice(2)
if (!input || !output) throw new Error('uso: logo-alpha.mjs <entrada.png> <saida.png> [piso]')

const python = `
from PIL import Image
FLOOR = ${Number(floor)}
im = Image.open(${JSON.stringify(input)}).convert('RGB')
px = im.load()
w, h = im.size
out = Image.new('RGBA', (w, h))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        a = max(r, g, b)
        # Piso de ruido. O "preto puro" que o modelo entrega tem grao: sem o
        # corte, cada pixel do fundo fica com 3 ou 4 de alfa, a imagem inteira
        # conta como opaca e o recorte da margem nao acontece — a logo chega na
        # tela com metade da caixa vazia em volta.
        if a <= FLOOR:
            op[x, y] = (0, 0, 0, 0)
        else:
            a = min(255, int((a - FLOOR) * 255.0 / (255 - FLOOR)))
            # Despremultiplica: recupera o tom cheio que o preto do fundo comeu.
            k = 255.0 / a
            op[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)), a)
# Corta a margem preta. O enquadramento do modelo é generoso, e sem o corte a
# logo ocupa metade da caixa que lhe foi dada na tela.
#
# O recorte olha para um alfa ALTO (>= 90), não para "qualquer coisa acima de
# zero". A borda do quadro guarda restos de compressão de um ou dois níveis
# acima do piso, e um getbbox() ingenuo enxerga a imagem inteira como opaca:
# o corte não acontece, e o defeito chega na tela como uma costura vertical
# fantasma na beirada do pôster.
mask = out.getchannel('A').point(lambda v: 255 if v >= 90 else 0)
box = mask.getbbox()
if box:
    pad = 8
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))
    out = out.crop(box)
out.save(${JSON.stringify(output)})
print(out.size[0], out.size[1])
`
const size = execFileSync('python3', ['-c', python], { encoding: 'utf8' }).trim()
console.log(`${output} ${size.replace(' ', 'x')}`)
