# Por que este app não tem deploy na Vercel

O totem não é um site. Ele roda dentro de um shell Electron, num painel com uma
impressora térmica USB presa nele, e o bundle é empurrado por SSH pela máquina
que faz o build:

    npm run panel

O SDK é **inlinado** pelo vite nesse bundle. O painel não tem `@fayz-ai` no
`node_modules` nem uma única referência a ele no JS que roda. É por isso que
subir uma mudança do SDK para o totem nunca precisou de uma publicação no npm.

A Vercel impunha o contrário: build em máquina limpa, `npm ci`, SDK vindo do
registry — e com isso toda alteração no SDK virava uma release antes de o painel
poder usá-la. Uma dependência de publicação inteira em troca de uma URL que
ninguém abre.

O CI continua: ele faz checkout do `fayz-sdk` ao lado e compila da FONTE, que é
exatamente o que a máquina de deploy faz. O que se perde é só o preview por PR.

Se um dia o totem tiver uma versão web de verdade, isto se reabre — e aí a
release passa a fazer sentido, porque aí o SDK realmente vem do npm.
