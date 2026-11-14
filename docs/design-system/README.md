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
