# Peladamas — sistema de interface

Versão atual em `design/ajustes-touch`. Detalhes da análise e validação em [revisao-interface-limpa.md](docs/design/revisao-interface-limpa.md).

## Direção

Uma ferramenta para organizar e atualizar jogos no celular. A ação deve ser fácil de encontrar. Evitar indicadores repetidos, blocos explicativos sempre abertos, múltiplas ações primárias e efeitos decorativos. A marca original com bola e PELADAMAS é preservada.

## Cores e tipografia

Tokens em `src/design.css`: texto `#24352e`, auxiliar `#59685f`, ação `#08764f`, hover `#065b3d`, placar `#203f32`, fundo `#f6f7f5`, superfície branca, bordas `#dce3dc`, foco `#145bd6`. DM Sans para operação, títulos e números. Lettering original da marca mantido. Títulos 25–30px, seções 18–20px, conteúdo 14–16px. Verde indica ação/seleção/resultado; controles secundários são neutros.

## Comportamento

Ranking compacto com edição contextual de nome/apelidos, notas diretamente acessíveis e controles de toque de pelo menos 44px. Salvar/descartar aparece durante a edição; fechar os campos não salva automaticamente. A ordem dos jogadores muda somente após salvar.

Página pública limitada à pelada do link. Três abas: Partidas, Resumo e Times. Criar partida pede dois times; adicionar gol pede autor e assistência; Editar continua disponível. Ajuda do sorteio e classificação é expansível. No administrador, a página compartilhável fica acima da seleção da pelada, conforme preferência do usuário.

## Implementação e validação

Preservar estados de erro, carregamento, vazio e sucesso. Campos de texto no celular com fonte de 16px. Foco visível, sem deslocamentos decorativos, respeitando movimento reduzido. Manter semântica das tabelas e rótulos dos controles. Mudanças de design não devem alterar algoritmo, permissões ou arquivos de dados.

Testes e limites estão no relatório. `main` faz deploy automático e só recebe esta branch com autorização explícita. Commits anteriores permanecem no histórico; `backup/design-v1` preserva a primeira proposta. As imagens em `docs/design/partidas-*.png` são históricas da v1, não capturas da interface atual.

## Ajuste de identidade verde

Cabeçalho verde escuro `#123f30`, marca branca/verde claro e controles de conexão com contraste adequado. Ações primárias e botões de adicionar gol usam verde preenchido; salvar, confirmar, criar e sortear compartilham esse padrão. Controles secundários e superfícies seguem discretos. Estrutura, densidade, tipografia e interações da revisão limpa permanecem.
