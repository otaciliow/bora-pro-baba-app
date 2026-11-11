# Bora pro Baba

Aplicação web para organizar partidas de futebol entre grupos. Os jogadores podem acompanhar a próxima partida, confirmar presença e enviar convites para convidados. Administradores gerenciam partidas, membros, mensalidades e avaliações; a tela de sorteio distribui os jogadores por posição e nota.

## Funcionalidades

- Cadastro e acesso de usuários por e-mail e senha com Supabase Auth.
- Criação de grupos ou solicitação para entrar em um grupo existente por código de convite.
- Lista de presença e convites para convidados.
- Gestão administrativa de partidas, solicitações de entrada, pagamentos, chave Pix e avaliações dos jogadores.
- Visualização de mensalidades e envio de comprovantes.
- Sorteio de times considerando posição e nota dos jogadores.

## Tecnologias

- React 19, TypeScript e Vite 8
- TanStack Start e TanStack Router
- Tailwind CSS 4
- Supabase Auth e PostgreSQL
- Drizzle Kit para configuração e migrações PostgreSQL

## Requisitos

- Node.js 20 ou superior e npm (o projeto também inclui `bun.lock` para quem preferir Bun).
- Um projeto Supabase para autenticação e dados da aplicação.

Confira as versões:

```bash
node --version
npm --version
```

## Instalação e configuração

Na raiz do repositório, instale as dependências:

```bash
npm install
```

Copie o arquivo de exemplo e configure as credenciais:

```powershell
Copy-Item .env.example .env
```

No macOS/Linux, use `cp .env.example .env`. Preencha no `.env` os valores do seu projeto Supabase:

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | URL do Supabase usada pelo servidor |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública usada pelo servidor e middleware de autenticação |
| `VITE_SUPABASE_URL` | URL do Supabase injetada no cliente pelo Vite |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública injetada no cliente pelo Vite |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada, necessária somente a operações administrativas do servidor que usam o cliente admin |
| `LOVABLE_DB_MIGRATION_URL` | URL PostgreSQL, necessária somente para executar Drizzle Kit |

As quatro primeiras variáveis são necessárias para a aplicação inicializar o cliente Supabase no navegador e no servidor. Obtenha a URL e a chave pública em **Project Settings > API** no painel do Supabase. Não use a chave `service_role` como chave pública e nunca exponha essa chave em variáveis `VITE_*`.

As configurações de autenticação do Supabase também precisam permitir a URL local da aplicação. Para testar o cadastro local, configure a confirmação de e-mail e o provedor de e-mail de acordo com o fluxo de desenvolvimento do seu projeto; não desative confirmações em um ambiente de produção sem avaliar as implicações de segurança.

> Não existe um fluxo de autenticação mock na aplicação atual. A tela `/login` chama o Supabase; sem URL e chave válidas, a inicialização ou o login falharão. Após alterar `.env`, pare e reinicie o servidor.

## Banco de dados e estado das migrações

A migração inicial está em [`drizzle/migrations/0000_multi_tenant_babas.sql`](drizzle/migrations/0000_multi_tenant_babas.sql). Ela cria tabelas básicas de perfis, grupos, membros, partidas, presenças e pagamentos, além de políticas RLS e funções de onboarding.

Para aplicá-la em um projeto Supabase, abra o **SQL Editor**, revise o SQL e execute-o no banco de desenvolvimento. Faça backup e revisão antes de aplicar mudanças em produção.

**Atenção:** a migração inicial não cobre todo o contrato usado pelo código atual. As telas também consultam `match_guests` e `guest_invites` e chamam funções RPC como `get_user_group`, `update_group_monthly_fee`, `update_group_pix` e `update_athlete_rating`, que não estão definidas nessa migração. Além disso, `drizzle/schema.ts` está vazio. Portanto, o SQL versionado ainda não é suficiente para habilitar todas as funções integradas ao Supabase. O build da aplicação pode ser executado, mas o uso dessas funções exige as migrações/objetos correspondentes no banco.

O Drizzle Kit lê `LOVABLE_DB_MIGRATION_URL` por meio de [`drizzle.config.ts`](drizzle.config.ts). Como o schema Drizzle ainda não está definido e não há scripts de migração no `package.json`, não use `drizzle-kit generate` esperando que ele gere o esquema completo da aplicação.

## Executar localmente

Depois de instalar dependências e preencher `.env`:

```bash
npm run dev
```

Abra o endereço impresso no terminal (por padrão, `http://localhost:5173`). Mantenha esse terminal aberto enquanto usa a aplicação; pressione `Ctrl+C` para parar o servidor.

Rotas principais:

- `/login`: entrar ou criar uma conta e criar/solicitar entrada em um grupo.
- `/`: próxima partida e presença.
- `/admin`: ferramentas administrativas do grupo.
- `/financeiro`: mensalidades e comprovantes.
- `/sorteio`: distribuição dos times.
- `/convite/:token`: fluxo de convite de convidado.

As páginas internas dependem de sessão autenticada e de um grupo/dados compatíveis no Supabase. A migração inicial, isoladamente, não configura todos os recursos citados na seção do banco.

## Scripts npm

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor Vite em desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run build:dev` | Gera o build no modo `development` |
| `npm run preview` | Pré-visualiza o build localmente |
| `npm run lint` | Executa ESLint em todo o repositório |
| `npm run format` | Formata arquivos com Prettier |

Verificações locais:

```bash
npm run lint
npm run build
```

Não há atualmente um script `npm test` definido no `package.json`.

## Estrutura do repositório

```text
src/
  components/       Telas e componentes da interface
  routes/           Rotas do TanStack Router
  integrations/     Integração e autenticação Supabase
  lib/              Autenticação, utilitários e tratamento de erros
  styles.css        Estilos globais
drizzle/
  schema.ts         Schema Drizzle (atualmente vazio)
  migrations/       Migrações SQL versionadas
public/             Arquivos estáticos
```

`src/routeTree.gen.ts` é gerado pelo TanStack Router. Crie ou altere rotas nos arquivos de `src/routes/`.

## Solução de problemas

### `npm run dev` termina com código 1

Leia a primeira mensagem de erro no terminal. Se mencionar `Missing Supabase environment variable(s)`, confira se `.env` existe na raiz e contém `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Reinicie o Vite depois de salvar o arquivo. Não compartilhe chaves ao pedir ajuda; substitua os valores por marcadores antes de enviar logs.

### O login funciona, mas as páginas mostram erros de tabela ou função inexistente

Compare a mensagem do Supabase com os objetos da seção [Banco de dados e estado das migrações](#banco-de-dados-e-estado-das-migrações). A migração atual não inclui todos os recursos que a interface consulta.

### `npm run lint` acusa erros do Prettier

O lint verifica todo o repositório e pode apontar diferenças de formatação ou finais de linha em arquivos existentes. Para formatar um arquivo específico, execute `npx prettier --write caminho/do/arquivo`; revise o diff antes de formatar muitos arquivos.

### Dependências inconsistentes

Use um único gerenciador por instalação. Para reinstalar com npm no PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

Não remova `package-lock.json` como tentativa de correção: ele registra as versões instaladas pelo npm.

## Segurança

- Não versione `.env` nem publique strings de conexão ou credenciais.
- Use somente a chave pública do Supabase no cliente. `SUPABASE_SERVICE_ROLE_KEY` deve permanecer exclusivamente no servidor.
- Mantenha RLS habilitado e revise as políticas antes de disponibilizar o banco em produção.

## Segurança

- Nunca versionar arquivos `.env` ou qualquer credencial sensível.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` no navegador.
- Manter o Row Level Security (RLS) habilitado nas tabelas do Supabase.
- Revisar políticas SQL antes de mandar o projeto para produção.
- Usar credenciais separadas entre ambiente local, homologação e produção.

## Contribuição

Para contribuir com o projeto:

1. Crie uma branch de trabalho.
2. Faça alterações e mantenha o código consistente.
3. Execute lint e build antes de enviar alterações.
4. Abra um pull request com descrição clara do problema e da solução.
