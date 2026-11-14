# Arena · Peladamas

Nova direção visual independente, na branch `design/liquid-arena`. Base recuperável anterior: `3daa67d`, em `design/jornada-do-usuario`. A main não participa desta experiência.

## Direção

Arena noturna: grafite azulado, iluminação tangerina e azul, tipografia Space Grotesk para títulos/placares e Manrope para a interface. Superfícies translúcidas têm borda iluminada, highlight especular e sombra curta. O reflexo acompanha o mouse em desktop; o conteúdo não se desloca. É uma aproximação de liquid glass em CSS, sem refração óptica real ou WebGL.

A folha `src/arena.css` substitui todas as cinco camadas antigas de CSS. Foram removidas da branch. Não há dependência nova. A interface, autenticação, APIs, concorrência e persistência continuam utilizando a implementação existente.

## Telas e interação

- Login com marca, introdução e formulário em uma superfície de vidro.
- Organização com data, convocados e duas ações: sortear ou compartilhar.
- Criação mantém etapas Lista/Revisão e paginação, em tema escuro.
- Sorteio em uma tela dedicada, com os três métodos preservados.
- Compartilhamento apresenta link e senha privada; times navegáveis.
- Ranking em lista ou grade, 12 jogadores por página; toque no nome edita estrelas.
- Partidas com placar sobre campo azul, gols rápidos e edição dedicada.
- Times em duas colunas no celular e três no desktop; cores azul, coral, lima e lavanda.
- Resumo compacto, com estatísticas e rankings individuais.
- Confirmações, estados vazios, mensagens e exclusão com senha seguem a paleta.

A navegação fica na lateral a partir de 1000px, no topo em tablets e numa barra de vidro inferior até 700px. A área de conteúdo reserva espaço para que a barra não impeça chegar às últimas ações. Os formulários não usam translucidez que reduza a legibilidade do texto.

## Sistema

| Token | Valor | Uso |
|---|---|---|
| Canvas | `#0b111a` | Fundo |
| Surface | `#14202e` | Painéis e fallback |
| Ink | `#f2f5f9` | Texto principal |
| Muted | `#a8b6c8` | Texto secundário |
| Accent | `#ffac82` | Ações e seleção |
| Danger | `#ffaba8` | Exclusão e erros |
| Glass | `#182332c9` | Navegação e login |
| Blur | 24px | Vidro da navegação |

Campos: 16px. Jogadores em grade: 44px mínimos. Botões principais: 42px. Raios de controles: 10–11px, superfícies 14–18px. Teclado tem foco visível; elementos decorativos são `aria-hidden`, sem eventos de clique. Movimento reduzido desativa transições e ambientação. Transparência reduzida usa superfícies opacas.

## Referências e skills

Referências consultadas, sem copiar layouts, imagens ou código proprietário:
- [Fantasy League & Match Dashboard — Orbix](https://dribbble.com/shots/27018803-Fantasy-League-Match-Dashboard-App-UI): hierarquia de placares e direção esportiva noturna.
- [Liquid Glass Design](https://liquidglassdesign.com/): materiais e reflexos.

Skills aplicadas:
- [Glassmorphism UI](https://github.com/hoboho/glassmorphism-ui/blob/main/SKILL.md): borda iluminada, blur, sombra, fallback e limites de camadas. A solicitação de trocar cores prevalece sobre preservar a paleta.
- [Transitions.dev](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/SKILL.md): controle deslizante já integrado, tokens e redução de movimento.
- [Taste](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md): hierarquia, composição, tipografia e sistema único. As regras de landing pages não são tratadas como requisitos de um aplicativo; não se declara aprovação pelo gate da skill.
- React Bits: Stepper original permanece integrado e foi adaptado ao novo tema.

## Verificação

Build TypeScript/Vite e 81 testes. Navegador em 320, 390, 768 e 1440px, com axe WCAG A/AA, overflow, edição e movimento reduzido. Fluxo real com API local e Neon de validação: login → criar pelada → sortear/publicar → abrir página sem login → criar partida → gol/assistência → resumo/times → editar → excluir pelada. Exclusão de partida verificada com senha errada, cancelamento, senha correta, outro jogo preservado e recálculo dos totais.

Nenhum deploy de produção. Não houve teste em aparelhos físicos.
