# Sem CI aqui

O totem não é um site e não tem deploy remoto. Ele sobe assim:

    npm run panel     # build → envia por SSH → reinicia    ~40s

O SDK é **inlinado** pelo vite nesse bundle. O painel não tem `@fayz-ai` no
`node_modules` nem uma referência a ele no JS que roda.

O CI existia e foi removido porque não conseguia fazer o mesmo: rodava em
máquina limpa e, para compilar, precisava do `fayz-sdk`, que é privado. As duas
saídas eram piores que o problema:

- **resolver o SDK do npm** → toda mudança no SDK vira uma release antes de
  poder subir no painel, que é justamente o acoplamento que foi removido;
- **um PAT no secret do repositório** → credencial de longa duração para um
  segundo repositório privado, mantida por ninguém, para verificar um app sem
  deploy automático.

Os portões continuam existindo, na máquina que faz o deploy:

    npm run typecheck    # lê o SDK da fonte, igual ao build
    npm test

Se um dia o totem tiver deploy remoto de verdade, o CI volta — e aí uma das duas
saídas acima passa a se pagar.
