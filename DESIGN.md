# Peladamas — teste de design

Branch: `teste-de-design`, baseada na main `077a0b8764ce804dff05ed9c05fd75c863a83bc1`.

## Objetivo e limites

Refinar a identidade verde existente usando o diagnóstico de UX. A página pública continua contendo apenas jogos, times e estatísticas da pelada do link. Sem navegação para outras peladas, sem login público e sem seleção de status de partida. Criar partida continua pedindo dois times; + Gol mantém somente autor e assistência; Editar permanece disponível em cada partida. Nenhum contrato de API ou formato de armazenamento mudou.

## Organização

A partida mais recente é o foco inicial, explicitamente identificada como tal, não como uma inferência de partida encerrada/em andamento. Os outros jogos da mesma pelada ficam em um histórico expansível, com edição e lançamento acessíveis. Placar é o primeiro conteúdo operacional; criação é uma ação contextual acima dele. Eventos do jogo podem ser consultados sem competir com os dois botões de gol. No celular, o formulário rápido usa uma coluna, eliminando rótulos quebrados; no desktop, usa duas.

## Sistema visual

Tokens em `src/design.css`: tinta #183b32; texto auxiliar #52675f; ação #086947; placar/header #123b30; superfície #fff; fundo #f2f5f1; borda #d7e2d9; foco #145bd6. Mesmas famílias já utilizadas: DM Sans para operação, Outfit para títulos e números. Escala de espaços 4,8,12,16,24,32,48. Bordas de 10–16px; superfícies com bordas discretas; login com elevação suave e botões primários com profundidade de pressionamento. Placar com números tabulares; controles de jogo48–50px e campos rápidos48px. Ícones operacionais Lucide; marca original com bola de futebol restaurada a pedido do usuário.

## Correções de UX e acessibilidade

- Confirmação explícita antes de trocar times que possuem eventos no rascunho.
- Recuperação de conflito no gol mantém escolhas e pede revisão, sem reaplicar automaticamente.
- Aviso de saída com preenchimento não salvo.
- Foco visível global, estados aria-pressed, mensagens administrativas em região viva.
- Áreas de toque e legibilidade ampliadas; apelidos com área/intervalo adequados.
- Ranking com semântica ARIA de tabela; classificação pública rolável e focalizável.
- Redução de movimento respeitada.

## Fora desta rodada

Não foi implementado novo ciclo de status de partidas, alteração de permissões, reorganização dos arquivos de dados, restauração persistente de rascunhos ou mudança do algoritmo de sorteio. Links com aba/filtro na URL e a revisão do diálogo de inclusão de novos jogadores no Geral podem ser feitos após validar o visual. O aviso de saída usa o comportamento nativo do navegador e não recupera automaticamente um rascunho descartado.

## Como revisar

`git fetch origin`, `git switch teste-de-design`, `npm install`, `npm run dev`. Página pública de teste deve usar uma pelada criada/sorteada no ambiente local. Dados locais não são sincronizados com Vercel. A main e o deploy de produção não fazem parte da publicação desta branch.

## Capturas da primeira proposta (v1)

Capturas históricas da v1 preservadas para comparação. A revisão 2 abaixo restaura a logo e altera o acabamento. Dados fictícios, ambiente local. A página pública permanece apenas na pelada do link.

![Página pública no celular](docs/design/partidas-celular.png)

![Página pública no computador](docs/design/partidas-desktop.png)

## Validação realizada

- 47 testes e build passaram.
- Fluxo completo no navegador: criar pelada, sortear/salvar times, criar partida, adicionar gol e assistência, refletir em outro navegador, corrigir via Editar, recalcular CSV e excluir a fixture.
- Sem overflow global nos estados avaliados em320,390,768 e1440px.
- Verificações Axe WCAG A/AA nas abas públicas e login/ranking; problemas identificados corrigidos nos estados verificados, sem alegação de certificação.
- Área dos botões de gol48px no celular e50px no desktop.
- Sem teste em telefone físico ou leitor de tela real; não houve gravação na produção.

## Revisão 2 — coerência do fluxo administrativo

Versão anterior preservada em `backup/design-v1`, commit `286202cf9e5d4741114280b173985f702ff7f2aa`. Esta revisão continua em `teste-de-design`; não integrar à main sem autorização.

| Problema observado | Decisão aplicada |
| --- | --- |
| “Criar pelada” estava dentro de uma aba chamada “Sortear times”. | A área passa a chamar “Organizar pelada”, com entrada para criar e outra para peladas já criadas. |
| Compartilhamento aparecia antes da seleção da pelada. | Primeiro selecionar; depois conferir lista/configurar/sortear; compartilhar após o resultado. |
| Criar e sortear pareciam tarefas desconectadas. | O botão explica que criar leva ao sorteio, já selecionando a pelada recém-criada. O roteiro lista as três etapas. |
| Lista completa de jogadores empurrava a ação principal para baixo. | Conferência expansível, com quantidade no título e notas/CSV disponíveis ao abrir. |
| Exclusão competia visualmente com preparação. | Ação em “Gerenciar Pelada N”, ao final, mantendo confirmação e identificação da pelada. |
| Busca dos times exibia instrução de sortear mesmo quando ainda carregava. | Compartilhamento diferencia carregamento, erro, ausência de times e times publicados. |
| A proposta anterior alterou a marca sem necessidade. | Logo com bola de futebol e PELADAMAS restaurada no login, cabeçalho e rodapé administrativo. |

Ranking continua responsável por nomes/apelidos/notas; organização usa as notas salvas na pelada selecionada. Página pública mantém apenas Partidas, Resumo e Times daquela pelada, sem diretório público. Criar partida continua pedindo somente os dois times. Gol e assistência permanecem no formulário compacto, com Editar disponível.

Acabamento: cabeçalho verde com variação tonal, linhas sutis de campo no placar, contraste corrigido no selo de resultado, profundidade dos botões, estados de hover/pressionamento, transição nas setas de expansão e breve confirmação visual de times publicados. Movimento reduzido desativa animações e deslocamento de botões.

Validação adicional: criação pela interface leva à seleção correta; compartilhamento bloqueado até os times serem publicados; seleção anterior ao link; uma única lista de jogadores após troca de pelada; exclusão pela nova área. Navegador em 320/390/768/1440px, sem overflow global nem violações Axe A/AA nos estados administrativos pós-sorteio verificados. Fluxo público completo também verificado. Testes automatizados e build aprovados; dados fictícios locais, sem escrita em produção.
