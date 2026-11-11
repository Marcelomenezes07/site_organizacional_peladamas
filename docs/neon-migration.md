# Migração do Peladamas para Neon

Preparação em 11/11/2026. Sem alteração da main ou publicação.

Projeto Neon: peladamas (spring-leaf-26567591), organização Marcelo, banco peladamas, branch production. Tabela criada com migrations/001_neon_documents.sql. Nenhum dado antigo precisa ser importado, conforme decisão do usuário. Sem registro de ranking, o aplicativo mantém sua lista inicial de jogadores existente.

## Ativação, somente após autorização

1. Conferir novamente a main e integrar as alterações desta branch.
2. Configurar STORAGE_PROVIDER=neon e DATABASE_URL nas variáveis exclusivamente do backend da Vercel. Obter a conexão no Neon; nunca usar prefixo VITE_ ou commitar credenciais.
3. Executar o teste scripts/test-neon.ts com Node e tsx, usando um arquivo de ambiente local ignorado pelo Git.
4. Validar login, ranking, criação, sorteio, publicação, partidas, gols, exclusão e dois clientes; conferir celular e desktop.
5. Publicar somente com autorização explícita. O workflow existente publica pushes na main; a branch feat/neon-storage desativa previews automáticos no vercel.json.

O adaptador preserva CSV/JSON, criação exclusiva e controle otimista de versão no banco. Updates/deletes condicionais são uma única operação SQL; conflitos continuam retornando 409. Não há fallback silencioso para Blob quando Neon é selecionado. Sem selecionar Neon, permanece o armazenamento anterior.

O painel reutiliza os arquivos carregados, reduzindo quatro listagens para duas e duas leituras por pelada para uma. Evita atualizações simultâneas e aplica espera progressiva após erros. Polling normal continua em 12 segundos; uma aba aberta pode manter o banco ativo e consumir a franquia de computação do Neon. A migração não significa consumo ilimitado.

## Validação executada

- 51 testes existentes passaram; build TypeScript/Vite passou.
- Tabela criada e consultada pelo conector Neon.
- Teste direto do adaptador chegou a gravar e atualizar um documento temporário, mas não concluiu no prazo de 35 segundos neste ambiente. Documento temporário removido; integração completa ainda pendente.
- Servidores locais iniciados com comandos alternativos. Playwright não abriu por falta do executável Chromium; validação visual pendente.
- Tentativa de configurar suspensão em 300 segundos foi recusada pelo plano. Configuração padrão mantida.

Não considerar esta preparação pronta para produção antes das validações pendentes. Para reverter a seleção de armazenamento, remover STORAGE_PROVIDER=neon; isso volta ao Blob antigo e não copia dados novos para ele. O Blob antigo continua sujeito ao bloqueio já existente.

## Validação de liberação — 11/11/2026

Revisão da branch claude/neon-storage-review-f3tg4k concluída em banco isolado codex-validation-20261111. Integração real do adaptador Neon passou (CRUD e conflitos concorrentes), assim como os fluxos de navegador: login, criação, sorteio, publicação, partidas, gols/assistências, edição, exclusão física e sincronização entre duas sessões. Viewports 390x844 e 1440x900 conferidos. Corrigido fallback de Copiar link quando Clipboard API não existe ou recusa acesso. Total: 55 testes e build aprovados.

Liberação autorizada pelo usuário. Vercel production usa STORAGE_PROVIDER=neon e DATABASE_URL da branch production do projeto Neon existente. Credenciais de login existentes preservadas. Dados fictícios permanecem exclusivamente no banco isolado. A validação acima substitui as pendências de integração e navegador da preparação inicial; testes de carga e aparelhos físicos não fazem parte desta validação.
