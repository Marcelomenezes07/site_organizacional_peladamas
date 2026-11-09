# Revisão de design — interface mais limpa

Branch: `design/ajustes-touch`. Base desta rodada: `13c173d`. Análise do código e da interface renderizada com dados fictícios locais; não é pesquisa de satisfação com jogadores reais.

## Objetivo

Facilitar tarefas rápidas no celular: encontrar um jogador, ajustar uma nota, criar uma partida e registrar um gol. A referência são padrões de aplicativos de uso diário: listas compactas, edição no contexto, uma hierarquia clara de ações e detalhes revelados quando necessários. A identidade do Peladamas permanece; não foi copiada a interface de outro produto.

## Diagnóstico e alterações

| Prioridade | Evidência na versão anterior | Alteração |
| --- | --- | --- |
| Alta | Todos os nomes e apelidos eram campos abertos, repetindo bordas e instruções por toda a lista. | Ranking compacto com nota diretamente editável. O lápis abre os campos apenas do jogador escolhido; exclusão fica dentro dessa edição. |
| Alta | Salvar ficava depois de toda a lista. | Barra de salvar/descartar aparece quando há alterações e acompanha a rolagem dentro do painel. Fechar os campos não salva nem descarta os dados. |
| Alta | Tela sem jogos mostrava duas ações para criar a primeira partida; durante a edição havia outro botão com o mesmo texto. | Uma entrada para criar; com o formulário aberto, o botão principal passa a ser a confirmação dentro dele. |
| Alta | Mensagem de erro ao salvar partida usava o mesmo ícone e a mesma cor de sucesso. | Erro tem indicação visual e região de alerta; sucesso tem confirmação própria. |
| Média | Cartões grandes repetiam ranking selecionado, total de jogadores e soma das estrelas. | Seleção é a referência do contexto; jogadores e média aparecem numa linha auxiliar. No sorteio, contagem permanece na seleção/lista e previsão de times junto da ação. |
| Média | Textos extensos explicando equilíbrio e regras competiam com os controles. | Ajuda expansível “Como funciona”, mantendo as regras disponíveis e alcançáveis por teclado. |
| Média | Cabeçalho escuro, placar, botões, selos e títulos disputavam contraste. | Cabeçalho claro, verde concentrado na ação principal e no placar; controles secundários neutros. |
| Média | Escalas, pesos e efeitos decorativos variavam muito entre telas. | DM Sans para interface, escala menor de títulos, pesos moderados, sombras/gradientes/movimento decorativo removidos. Logo original preservada. |
| Média | Roteiro de etapas continuava destacando “Sortear” mesmo com partidas existentes. | Roteiro removido; nomes das ações e contexto da pelada orientam o fluxo. |

## Sistema visual

- Fundo `#f6f7f5`, superfícies brancas, bordas `#dce3dc`.
- Texto principal `#24352e`, texto auxiliar `#59685f`.
- Ação `#176747`, hover `#105238`, placar `#203f32`.
- DM Sans para títulos, campos e dados; lettering da marca original mantido.
- Títulos principais 25–30px; títulos de seção 18–20px; conteúdo 14–16px.
- Campos de edição no celular com fonte de 16px e controles de pelo menos 44px. Linhas compactas do ranking têm mínimo de 76px em telas estreitas, expandindo conforme o conteúdo.
- Foco de teclado visível e movimento reduzido preservados.

## Fluxos preservados

Página pública só da pelada do link; Partidas/Resumo/Times; criação com dois times; gol com autor e assistência; Editar; classificação/rankings e atualização periódica. No administrador: cadastro, notas, apelidos, importação da lista, revisão, sorteio, copiar link/times, exportação CSV, confirmação de exclusão. Compartilhamento permanece no topo por solicitação do usuário.

A ordem do ranking permanece estável durante a edição e é recalculada ao salvar. A troca de classificação não grava automaticamente alterações. Algoritmo de sorteio, APIs, autenticação e formatos de armazenamento não foram alterados nesta rodada.

## Verificação

- 51 testes automatizados aprovados, incluindo edição contextual, ordenação durante/salvar edição, criação, gols, conflitos, armazenamento e autenticação.
- Build de produção aprovado.
- Fluxo no navegador com API e arquivos locais: login, criar pelada pela interface, sortear e publicar, copiar link, visualizar times anonimamente, criar partida, adicionar gol/assistência, atualizar outro navegador, editar placar, recalcular CSV e excluir a fixture.
- Edição de apelidos e notas por toque, salvamento e recarga também verificados com API simulada.
- 32 combinações de tela/largura com Axe A/AA, sem violações reportadas ou overflow global: Partidas, Gol, Resumo, Times, Login, Ranking, Organização e Criação, em 320/390/768/1440px. Sorteio com resultado verificado adicionalmente nas quatro larguras.
- Capturas revisadas internamente, sem gerar nova galeria para o usuário.

## Limites e próximos passos

Essas verificações não garantem ausência de todo defeito. Não houve teste em iPhone/Android físico, leitor de tela real, carga concorrente em produção nem entrevista com participantes. A densidade e a descoberta do lápis devem ser confirmadas no uso real. Rascunho persistente e navegação por abas na URL continuam fora desta rodada. Produção e main não são alteradas por esta entrega.
