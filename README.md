# Bora pro Baba

Aplicação web para organizar partidas de futebol em grupo. Atletas podem
consultar a próxima partida, confirmar presença e acompanhar mensalidades.
A diretoria pode aprovar membros, gerir partidas e pagamentos, configurar o
grupo e avaliar atletas. A tela de sorteio monta times equilibrados por
posição e nota.

## Funcionalidades

### Atletas

- Criar conta ou entrar com e-mail e senha.
- Criar um grupo ou solicitar entrada por código de convite.
- Consultar a próxima partida aberta.
- Confirmar ou cancelar presença.
- Consultar mensalidade e chave PIX.
- Informar pagamentos e acompanhar seu histórico.
- Participar por meio de um link público de convidado.
- Sortear times considerando posição e nota e copiar a escalação.

### Diretoria

- Aprovar ou rejeitar solicitações de entrada.
- Alterar status e papel dos membros.
- Criar, editar, fechar e excluir partidas.
- Configurar limite de atletas confirmados.
- Gerar convites para convidados.
- Aprovar ou remover convidados da lista.
- Configurar mensalidade e chave PIX.
- Aprovar ou rejeitar pagamentos.
- Avaliar atletas para o sorteio de times.

## Stack

- React 19 e TypeScript
- TanStack Start e TanStack Router
- TanStack Query
- Vite 8
- Tailwind CSS 4
- Radix UI, Lucide React e componentes internos
- Supabase Auth e PostgreSQL
- Drizzle Kit e SQL versionado
- ESLint, Prettier e Vitest

## Estrutura

```text
.
|-- drizzle/
|   |-- migrations/       Migrações SQL e metadados
|   `-- schema.ts         Schema Drizzle; atualmente vazio
|-- public/               Arquivos estáticos
`-- src/
    |-- components/       Telas e componentes da interface
    |   `-- ui/           Componentes reutilizáveis
    |-- hooks/            Hooks da aplicação
    |-- integrations/
    |   `-- supabase/     Clientes, middleware e tipos Supabase
    |-- lib/              Auth, consultas e utilitários
    |-- routes/           Rotas file-based do TanStack Router
    |-- routeTree.gen.ts  Arquivo gerado pelo router
    |-- router.tsx        Configuração do router
    |-- start.ts          Inicialização da aplicação
    `-- server.ts         Entrada SSR
```

O TanStack Router gera `src/routeTree.gen.ts`. Não edite esse arquivo
diretamente; altere os arquivos em `src/routes/`.

### Rotas

| Rota | Descrição |
| --- | --- |
| `/login` | Entrar ou criar conta |
| `/` | Próxima partida e lista de presença |
| `/admin` | Gestão do grupo e da diretoria |
| `/financeiro` | Mensalidade, PIX e pagamentos |
| `/sorteio` | Distribuição dos times |
| `/convite/$token` | Inscrição pública de convidado |

## Pré-requisitos

- Node.js 20.19+ ou 22.12+
- npm 10+
- Projeto Supabase
- PowerShell ou outro terminal compatível

Confira as versões:

```powershell
node --version
npm --version
```

## Instalação

Na raiz do repositório:

```powershell
npm install
```

Use npm de forma consistente. `package-lock.json` é o lockfile versionado da
aplicação.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Em **Project Settings > API**, obtenha a URL e a chave pública.
3. Copie o arquivo de exemplo:

```powershell
Copy-Item .env.example .env
```

No macOS/Linux:

```bash
cp .env.example .env
```

As variáveis utilizadas são:

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | URL usada pelo servidor e fallback do cliente |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública usada pelo servidor e fallback |
| `VITE_SUPABASE_URL` | URL enviada ao cliente pelo Vite |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública enviada ao cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada exclusiva de operações server-side |
| `SUPABASE_PROJECT_ID` | Identificador opcional do projeto |
| `VITE_SUPABASE_PROJECT_ID` | Identificador opcional disponível no cliente |
| `LOVABLE_DB_MIGRATION_URL` | URL PostgreSQL para o Drizzle Kit |

Exemplo mínimo:

```dotenv
SUPABASE_URL="https://SEU-PROJETO.supabase.co"
SUPABASE_PUBLISHABLE_KEY="SUA_CHAVE_PUBLICA"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_CHAVE_PUBLICA"
```

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` em uma variável `VITE_*`, nunca
publique essa chave e não envie arquivos `.env` ao repositório.

Configure no Supabase os provedores de autenticação, templates de e-mail e URLs
permitidas para o endereço local e para o ambiente de produção. Após alterar
`.env`, reinicie o servidor Vite.

## Banco de dados

As migrações versionadas devem ser aplicadas em ordem no SQL Editor de um
projeto Supabase de desenvolvimento:

1. `drizzle/migrations/0000_multi_tenant_babas.sql`
2. `drizzle/migrations/0001_single_baba_and_guests.sql`
3. `drizzle/migrations/0002_group_max_confirmed.sql`
4. `drizzle/migrations/0003_queries_rulesets_migrations.sql`

Elas criam ou alteram perfis, grupos, membros, partidas, presenças, convidados,
pagamentos, funções RPC e políticas RLS.

Antes de aplicar migrações em produção:

- faça backup do banco;
- revise o SQL completo;
- confirme o projeto Supabase selecionado;
- teste RLS e permissões;
- use credenciais separadas por ambiente.

O estado atual tem duas limitações importantes:

- `drizzle/schema.ts` está vazio e não representa o banco da aplicação;
- o Drizzle Kit está configurado em `drizzle.config.ts`, mas não há schema
  Drizzle implementado nem scripts de migração no `package.json`.

Não execute `drizzle-kit generate` esperando recriar automaticamente todas as
tabelas da aplicação. `LOVABLE_DB_MIGRATION_URL` só é necessário para uma
operação direta via Drizzle Kit.

## Executar localmente

Depois de instalar as dependências, configurar o `.env` e aplicar as migrações:

```powershell
npm run dev
```

Abra o endereço exibido no terminal, normalmente
`http://localhost:5173`. Use `Ctrl+C` para encerrar o servidor.

Não existe autenticação mock. A tela `/login` depende do Supabase. Sem as
variáveis mínimas, o cliente informa quais variáveis estão ausentes. Sem as
tabelas, funções RPC e políticas necessárias no banco, consultas e ações podem
falhar mesmo quando o login inicial funciona.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor Vite em desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run build:dev` | Gera o build no modo `development` |
| `npm run preview` | Serve localmente o build gerado |
| `npm run lint` | Executa ESLint em todo o repositório |
| `npm run format` | Formata arquivos com Prettier |

Não há script `test` no `package.json`. Execute o teste atual com:

```powershell
npx vitest run
```

Verificações recomendadas antes de entregar uma alteração:

```powershell
npx vitest run
npm run lint
npm run build
```

## Solução de problemas

### Variáveis do Supabase ausentes

Confirme que `.env` está na raiz e contém:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Depois reinicie o servidor Vite.

### Tabela, política ou função inexistente

Verifique se todas as migrações foram aplicadas no projeto correto e se a conta
possui a função ou política necessária. Compare a mensagem do Supabase com os
arquivos de `drizzle/migrations/`.

### Dependências inconsistentes

Para reinstalar com npm no PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

Não remova `package-lock.json`.

### Erros de formatação

Formate um arquivo específico e revise o diff:

```powershell
npx prettier --write caminho/do/arquivo
```

## Segurança

- Não versione `.env`, strings de conexão ou credenciais.
- Use somente a chave pública no cliente.
- Mantenha `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor.
- Mantenha RLS habilitado e revise todas as políticas.
- Não use dados reais de produção em testes locais.

## Contribuição

1. Crie uma branch a partir da versão principal.
2. Faça alterações pequenas e relacionadas.
3. Preserve os padrões existentes de React, TypeScript e TanStack Router.
4. Execute testes, lint e build.
5. Abra um pull request com contexto, mudanças e validações realizadas.
