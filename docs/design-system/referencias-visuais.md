# Direção visual: Clubhouse

## Referências externas consultadas

- [Linear](https://linear.app/): organização visual de um produto de trabalho; referência para hierarquia, navegação discreta, superfícies e acabamentos. Não foi copiado código, texto, fonte ou identidade da Linear.
- [FotMob](https://www.fotmob.com/): produto de futebol orientado a partidas, times e placares; referência para prioridade do resultado e identificação dos times.
- [Strava](https://www.strava.com/features): contexto esportivo e ações de produto; referência de direção para presença da marca e contraste entre ação e informação.

As escolhas abaixo são uma interpretação própria para o Peladamas, não uma reprodução dessas interfaces. Não há assets de terceiros nem novos serviços/dependências no navegador.

## Aplicação

Camada de acabamento em `src/visual-polish.css`, carregada depois da base e do design system. Verde original, logo e campo do placar mantidos. Títulos em Outfit já disponível; corpo DM Sans. Fundo sálvia muito claro, branco de superfície, contraste de texto escuro, bordas finas e sombras de baixa opacidade. Vidro em cabeçalhos e navegação, com alternativa sólida quando não há backdrop-filter.

Ações da pelada ganham ícones enquadrados e uma linha curta de apoio. Formulários recebem bordas, raios e estados de hover/foco coerentes. Cartões esportivos mantêm placar dominante. Times usam tokens por `data-team`, preservando azul, pêssego, verde e amarelo. Ranking continua compacto. Login recebe a mesma linguagem de superfície e tipografia. Movimento somente em hover/pressionado e navegação; preferência por movimento reduzido respeitada.

## Validação

78 testes automatizados e build passaram. Checagem visual de administrador, ranking, partidas, times e resumo em 320/390/768/1440px, usando fixtures locais. Axe para WCAG 2/2.1 A/AA e ausência de overflow horizontal nos estados conferidos. Conferência manual das capturas do administrador e partidas em celular e desktop. Sem alterações de backend ou deploy.
