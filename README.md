# ⚽ Peladamas — Ranking e Sorteio

Aplicativo web **mobile-first** com duas abas, rankings por pelada e CSVs centralizados. A administração fica em `/adm` e exige login com usuário e senha. O endereço principal redireciona para `/adm`.

## Funcionalidades

- Login simples em `/adm`, botão Sair e exclusão de peladas com confirmação.
- Dois modos de sorteio: equilíbrio geral e faixas de habilidade.
- Novos jogadores destacados em amarelo; notas ajustadas em verde; inclusão no Geral com confirmação em lote.

- **Ranking Geral** com notas de 0,5 a 5 (passo de 0,5), edição de nomes/apelidos, inclusão e exclusão.
- **Histórico de todas as peladas** selecionável no Ranking. A opção **Geral** sempre vem primeiro e é a padrão.
- **Criar Pelada:** colar lista do WhatsApp, reconhecer nomes/apelidos, revisar estrelas e salvar `peladas/pelada_N.csv`.
- **Sortear Times:** escolher pelada e jogadores por time, distribuir sem repetir ninguém, equilibrar médias e refazer sorteios.
- **Copiar para WhatsApp**, **baixar CSV**, atualização automática a cada 12 segundos e ao voltar para o site.
- **PWA:** pode ser instalada no celular. Para editar/sortear dados atualizados precisa da internet; o cache offline não permite salvar alterações.

## Rodar no computador (sem configuração externa)

Instale Node 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Configure `ADMIN_PASSWORD_HASH` e `ADMIN_SESSION_SECRET` em `.env.local` e abra `http://localhost:5173/adm`. No ambiente local, os CSVs são gravados na pasta `.local-data/`. Ela é ignorada pelo Git.

Para testar a lógica e gerar a versão de produção:

```bash
npm test
npm run build
```

## Publicar na Vercel com sincronização entre celulares

1. Suba **este projeto** a um repositório GitHub (não inclua `.local-data`, `.env` nem `node_modules`).
2. Na [Vercel](https://vercel.com), importe o repositório como novo projeto. A Vercel deve detectar **Vite**.
3. Em **Storage → Create**, escolha **Blob**, com acesso **Private**, e conecte o armazenamento ao projeto (incluindo Production e Preview, conforme desejado).
4. Confirme que `BLOB_READ_WRITE_TOKEN` foi disponibilizado para as funções e realize um novo deploy.
5. Acesse o URL da Vercel no celular. Na aba Ranking, faça uma pequena edição e clique em **Salvar alterações**. Isso cria `ranking_geral.csv` no Blob.
6. Cole uma lista na aba **Sortear Times → Criar pelada**. Confirmar cria `peladas/pelada_1.csv`, depois `pelada_2.csv` e assim por diante.
7. Abra o site em outro celular e confira o ranking/histórico. As mudanças são atualizadas a cada **12 segundos** ou ao retornar ao app.

**Observação:** este repositório público usa 22 jogadores fictícios como exemplo. Os nomes e notas reais ficam exclusivamente no armazenamento privado da aplicação.

## Organização dos dados

```text
ranking_geral.csv
peladas/
  pelada_1.csv
  pelada_2.csv
```

As colunas são separadas por `;` para permitir que estrelas decimais usem vírgula (ex.: `3,5`):

```csv
id;nome;apelidos;estrelas
j001;Jogador Á;;5
j008;Jogador 08;;3,5
```

O CSV de cada pelada tem também a coluna `criada_em`. Os snapshots são independentes: editar o Geral não muda peladas antigas, e editar um histórico não muda o Geral.

## Segurança e limitações

- **Acesso administrativo:** a interface e a API exigem sessão. As credenciais são verificadas no servidor; o cookie é HttpOnly, SameSite=Strict e Secure em produção, com validade de 12 horas. O botão Sair remove o cookie. Tentativas de login têm limitação por IP por instância.
- `ADMIN_PASSWORD_HASH` usa o formato `salt:hash`, com scrypt de 64 bytes. `ADMIN_SESSION_SECRET` deve ser aleatório, com pelo menos 32 caracteres. Configure ambos como segredos na Vercel. Nenhum deles usa prefixo `VITE_`.
- **Excluir pelada:** exige confirmação e versão atual do histórico. Os dados dos jogadores são removidos daquele arquivo; o CSV e as revisões de partidas são removidos. Um registro mínimo em `excluidas/pelada_N.json` reserva somente o número para não reutilizá-lo. Não altera o Geral nem outros históricos.
- O `BLOB_READ_WRITE_TOKEN` deve ficar **somente no backend**. Nunca use `VITE_BLOB_READ_WRITE_TOKEN`.
- Cada gravação existente usa ETag (`ifMatch`), reduzindo risco de sobrescrever uma alteração concorrente; em caso de conflito, é necessário recarregar e reaplicar a mudança.
- Os sorteios são executados no navegador. As equipes sorteadas **não são armazenadas**, apenas os jogadores e estrelas da pelada.
- O site não depende de Google Sheets ou conta Google.
- Ao usar Vercel Blob, custos/limites dependem do plano. Consulte o painel de uso.
- O ambiente de desenvolvimento persiste dados em disco local; **Vercel não usa disco local para os dados de produção**.

## Próximas melhorias opcionais

Histórico de sorteios, importação CSV, backups versionados, edição em tempo real via WebSocket e previsão de times baseada em posição/goleiro.

## Página pública de cada pelada

- `/pelada/NUMERO` abre sem login. No administrador, clique em **Sortear times**. O sorteio é salvo automaticamente antes de liberar **Copiar link**. Use **Abrir página da pelada** ou **Copiar link** para compartilhar.
- **Atualizar pelada** permite criar partidas, marcar como a jogar/finalizada e corrigir placar, autores e assistências. Cada gol deve ser atribuído a um jogador do time ou marcado como gol contra. Assistências são opcionais.
- **Resumo** mostra líderes (incluindo empates), classificação por pontos/saldo/gols marcados e rankings de gols e assistências. Partidas a jogar não pontuam.
- Vitórias valem 3 pontos e empates 1 ponto. Gol contra conta para o time beneficiado, sem crédito individual.
- Qualquer pessoa com o link pode corrigir partidas. Somente o administrador pode publicar times, modificar nomes/estrelas ou excluir a pelada. Depois de publicar, os convocados ficam fixos; depois de registrar partidas, os times também ficam fixos.
- `peladas/pelada_N.csv` contém `gols`, `assistencias` e `estado_partidas`. O último campo aponta para um arquivo privado `partidas/pelada_N_UUID.json`, com os times e as partidas daquela revisão. Os totais são recalculados, nunca incrementados manualmente.
- A revisão é gravada primeiro; depois uma atualização condicional por ETag publica o ponteiro e os totais juntos no CSV. Uma escrita concorrente recebe conflito, mantendo a edição na tela para revisão. Arquivos de revisões anteriores permanecem privados; apenas o ponteiro atual é usado.
- CSVs antigos continuam funcionando. Ao salvar os times ou editar a pelada, as novas colunas são escritas sem alterar o Ranking Geral.

### Exclusão e publicação dos times

O botão **Sortear times** só apresenta o sorteio como concluído após a gravação no servidor. Se já existirem times publicados, substituir exige confirmação; com partidas registradas, a troca continua bloqueada.

Excluir uma pelada remove o CSV e os JSONs de suas revisões. O número fica reservado em `excluidas/pelada_N.json`, sem nomes nem resultados. Se a limpeza falhar, ou houver marcadores de exclusões feitos pela versão anterior, o administrador vê **Concluir exclusão** para repetir a limpeza. A página pública retorna 404 para uma pelada desativada ou removida.

As alterações devem ser enviadas primeiro ao GitHub para teste local. Deploy na Vercel somente após autorização explícita do responsável, usando a versão atual do GitHub.

A página pública de cada pelada tem três abas: Atualizar pelada, Resumo e Times. Em Times, cada equipe mostra sua lista de jogadores.
