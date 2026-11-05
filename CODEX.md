# Orientações para continuar no Codex

Este repositório já contém a aplicação Peladamas, com frontend React/Vite e funções de API usando Vercel Blob. Não refaça o projeto do zero.

1. Execute `npm install`, `npm test`, `npm run build` e corrija qualquer erro de dependência ou tipo que aparecer.
2. Rode `npm run dev` e teste a interface nos tamanhos 390×844 e 1440×900.
3. O modo local guarda CSV em `.local-data/`. Para produção, vincule um Blob store **Private** na Vercel; o token é lido apenas no backend.
4. Faça o deploy na Vercel usando GitHub ou CLI, com autorização do usuário. **Não compartilhe tokens** e não faça push de `.env` ou `.local-data`.
5. Teste com dois navegadores/celulares: alterar Geral, criar Pelada 1 e Pelada 2, editar histórico antigo, conferir atualizações em até 12s, sortear, refazer e copiar texto.
6. Preserve os requisitos: duas abas, seletor Geral sempre primeiro, históricos independentes, login administrativo em `/adm`, classificação de 0,5 a 5, armazenamento central de CSV, sorteio equilibrado.

As notas iniciais de diversos jogadores são provisórias e devem ser revisadas no primeiro uso.
