# Design system Peladamas

## Direção

Aplicação esportiva de operação rápida no celular. Verde identifica ação e contexto; cores dos times permanecem. A marca original e as fontes DM Sans e Outfit são preservadas. Superfícies claras, texto escuro e um único foco principal por tarefa. Glassmorphism somente na navegação e cabeçalhos de tarefa, com opacidade alta e fundo sólido quando blur não está disponível. Tabelas, placares, campos e mensagens não dependem de transparência.

## Tokens

Fonte de verdade: `src/design-system.css`, com aliases aos tokens da identidade em `src/design.css`.

| Categoria | Tokens | Uso |
|---|---|---|
| Texto | `--ds-color-text`, `--ds-color-muted` | Conteúdo e contexto |
| Ação | `--ds-color-action`, `--ds-color-danger` | Salvar/continuar e exclusão |
| Superfície | `--ds-color-surface`, `--ds-color-border` | Formulários e separadores |
| Espaço | xs=4, sm=8, md=16, lg=24, xl=32 | Ritmo comum |
| Raios | control=10, panel=16 | Controles e superfícies |
| Sombra | panel, float | Hierarquia discreta |
| Movimento | fast=160ms, normal=240ms, ease | Feedback funcional, reduzido a zero conforme preferência |
| Dimensão | control-height=44px, content-width=720px | Toque e telas dedicadas |

## Componentes e padrões

- `ScreenHeader`: título, contexto e voltar. Foco no título ao entrar na edição; botão com mínimo de 44px. Fundo `.ds-glass` com alternativa sólida.
- `JourneyNav`: navegação de áreas ou times, indicador animado com redução de movimento.
- `Stepper`: etapas de criação; voltar preserva revisão; etapas não permitem pular validação.
- `.ds-task-actions`: ações da pelada selecionada; no celular ficam em coluna.
- `.ds-task-panel`: formulário com largura limitada e uma ação principal.
- `.ds-editor-page`: tela de partida dedicada; a lista e as abas públicas não aparecem junto do formulário.
- `.ds-team-disclosure`: times visíveis na criação; na edição ficam recolhidos para priorizar placar e gols.
- Cartão de gol: autor e assistência em linha, lixeira com nome acessível. Quatro gols por página.
- `.edit-save-actions`: ações de salvar/cancelar em área sticky com espaço próprio, sem sobrepor os controles de gols.
- Exclusão: ação secundária separada; senha e confirmação obrigatórias.

## Estados

Botões: padrão, hover, foco visível, pressionado, desabilitado e ocupado. Erros mantêm a edição; conflitos de versão impedem sobrescrita. Vazio mantém um próximo passo. Ações destrutivas são separadas das ações principais. Não reduzir a fonte dos campos abaixo de 16px no celular. Não usar blur em campos de entrada nem para esconder informação essencial.

## Reutilização

Novas telas usam `ScreenHeader` e tokens sem copiar valores arbitrários. Novas tarefas ganham contexto e retorno explícitos. Não adicionar efeitos 3D ou dependências de animação para tarefas que CSS resolve. As exceções históricas de CSS serão migradas gradualmente; não houve reescrita de toda a aplicação.

## Acabamento visual Clubhouse

A camada `src/visual-polish.css` refina o sistema para a identidade esportiva: títulos em Outfit, fundo sálvia, superfícies brancas com profundidade leve e controles com estados consistentes. Tokens `--club-team`, `--club-team-soft` e `--club-team-border` identificam os quatro times sem depender apenas da cor (o nome acompanha). Referências e decisões em [referencias-visuais.md](referencias-visuais.md).

## Edição minimalista

A edição existente usa `.ds-editor-minimal`: uma superfície branca contínua, linhas finas no lugar de cartões, placar sem moldura, campos com apenas borda inferior e ações alinhadas ao formulário. No celular, a superfície ocupa a tela sem borda externa. Salvar permanece a única ação preenchida. A criação de partida e as outras telas conservam seus estilos. Validação: 78 testes/build e editor em quatro larguras com axe sem violações.

### Superfície contínua e ranking em grade

A camada `src/app-surfaces.css` usa DM Sans em títulos, dados e controles; Outfit permanece na marca. O fundo combina verde e areia em gradientes estáticos suaves, sem imagens ou animação atrás dos dados. A área principal é contínua: sem moldura externa no ranking nem cartões em volta de cada jogador. Molduras semânticas, como compartilhar e placares, continuam disponíveis.

Glassmorphism fica na navegação principal: branco translúcido, blur de 22px, saturação de 145%, borda iluminada e sombra suave. Evitamos vidro aninhado e vidro nas linhas de dados. Há fundo opaco sem suporte a backdrop-filter e para `prefers-reduced-transparency`. As transições existentes respeitam redução de movimento.

Ranking tem Lista/Grade e seis jogadores por página; a busca inclui todos os jogadores. Mudar página/layout mantém o rascunho inteiro. Salvar envia todos os jogadores, inclusive os não visíveis. Novo jogador abre a última página e limpa a busca para ficar visível. A edição ocupa a largura da grade para facilitar nomes e apelidos no celular.

Skills consultadas:
- [Taste](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md): hierarquia, coerência tipográfica, alinhamento e refinamento. Aplicação adaptada ao aplicativo existente; não se declara aprovação pelo gate de landing pages.
- [Glassmorphism UI](https://github.com/hoboho/glassmorphism-ui/blob/main/SKILL.md): material derivado da paleta existente, contraste, fallback e performance. A solicitação de poucas divisões e fundo discreto prevalece sobre vidro em todos os elementos e auroras animadas.
- [Transitions](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/16-tabs-sliding.md): reutilização do controle de navegação já implementado para Lista/Grade.
- [React Bits](https://github.com/Philotheephilix/reactbits.dev-skill): Stepper original já integrado permanece no fluxo; nenhum efeito adicional pesado é necessário.

Validação: build, 80 testes, auditoria axe WCAG A/AA e overflow em 320/390/768/1440, dados fictícios no navegador. Não substitui teste em aparelhos físicos.

Ajuste da grade: os jogadores agora usam linhas compactas em verde suave, como a lista da pelada. Tocar no nome abre somente as estrelas; selecionar a nota fecha o seletor e mantém a alteração no rascunho para salvar. Nome e apelidos continuam disponíveis na visualização Lista. O detalhe vertical decorativo do seletor de pelada foi removido e o botão de corrigir notas segue o fluxo abaixo da lista, com espaçamento próprio.
