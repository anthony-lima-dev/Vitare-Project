# 17. Desenvolvimento e testes

[🇧🇷 Português (Brasil)](17-desenvolvimento-testes.md) | [🇺🇸 English](../en/17-development-testing.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 17.1 Requisitos

- Node.js 22.
- Corepack.
- pnpm `11.9.0`, declarado no `packageManager` do `package.json` raiz.
- Docker Engine e plugin Docker Compose para ambientes integrados.
- PostgreSQL e Redis disponíveis localmente ou por Compose para testes da API.

## 17.2 Instalação

Na raiz do monorepo:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile
```

O workspace inclui `apps/*` e `packages/*`. Utilize o lockfile versionado e mantenha o gerenciador de pacotes na versão declarada.

## 17.3 Execução em desenvolvimento

O `package.json` raiz oferece:

```bash
pnpm dev:api
pnpm dev:patient
pnpm dev:staff
```

Esses comandos iniciam API, aplicação do paciente e portal da equipe. Os frontends utilizam proxy Vite para encaminhar `/api` ao backend local. O portal da equipe também configura proxy de `/socket.io` com suporte a WebSocket.

A API exige as variáveis obrigatórias definidas em `apps/api/src/config/configuration.ts`, além de acesso ao PostgreSQL. Redis é utilizado quando `REDIS_URL` estiver configurada.

## 17.4 Build do monorepo

O build completo é executado por:

```bash
pnpm build
```

A sequência compila pacotes compartilhados, API e frontends. O processo do backend gera o cliente Prisma antes da compilação NestJS. Cada frontend executa TypeScript build (`tsc -b`) e Vite build.

## 17.5 Lint e verificação de infraestrutura

```bash
pnpm lint
pnpm check:infra
```

`pnpm lint` executa ESLint em `apps/web`, `apps/web-staff` e `apps/api`. `pnpm check:infra` executa `scripts/check-docker-build-context.mjs` para verificar a estrutura do contexto de build utilizado pelos Dockerfiles.

## 17.6 Prisma

Os comandos de manutenção do schema são executados no workspace da API:

```bash
pnpm --filter @vitare/api exec prisma validate
pnpm --filter @vitare/api exec prisma generate
pnpm --filter @vitare/api exec prisma migrate status
```

O Prisma CLI utiliza `apps/api/prisma.config.ts`. O seed está definido nesse arquivo e aponta para `prisma/seed.ts`.

Para aplicar migrações no ambiente local:

```bash
cd infra/local
docker compose --env-file .env.local -f compose.yaml run --rm migrate
```

No ambiente público, o serviço `migrate` é executado pelo Compose antes da API.

## 17.7 Testes unitários

A API utiliza Jest:

```bash
pnpm --filter @vitare/api test
```

O frontend do paciente utiliza Vitest:

```bash
pnpm --filter @vitare/web test
```

O portal da equipe também utiliza Vitest:

```bash
pnpm --filter @vitare/web-staff test
```

Existem testes de casos de uso, componentes, adaptadores, criptografia, persistência e integração. Os testes devem ser executados no ambiente correspondente às dependências exigidas por cada módulo.

## 17.8 Testes de navegador

O repositório inclui Playwright e configuração em `playwright.config.ts`. O teste E2E disponível está em `tests/e2e/offline.spec.ts`.

Execução:

```bash
pnpm exec playwright test
```

A validação de navegador deve considerar instalação PWA, escopos separados dos Service Workers, navegação offline, IndexedDB, sincronização, autenticação e comunicação com a API.

## 17.9 Matriz de validação funcional

| Área | Verificações |
|---|---|
| Cadastro e login | Cadastro local, OAuth Google, callback e aceite dos documentos. |
| Sessões | Renovação, rotação do refresh token, logout e expiração. |
| Perfil | Leitura e atualização dos dados do paciente. |
| Domínio clínico | Condições, medicamentos, histórico, alergias, restrições e contatos. |
| Catálogos | Pesquisa de doenças e medicamentos e carga do seed. |
| Emergência | Com e sem localização, chave de idempotência e resposta do servidor. |
| Sincronização | Persistência local, recuperação após conexão, replay e confirmação. |
| Equipe | Login, feed, aceite, resolução e localização. |
| Consulta por CPF | Normalização, papéis autorizados e registro da auditoria. |
| Segurança | Campos cifrados, índices cegos, guards e validação de DTOs. |
| PWA | Instalação, atualização do Service Worker, cache e modo offline. |
| Infraestrutura | Compose, migrations, healthchecks, Nginx, Tunnel e WebSocket. |

## 17.10 Testes das aplicações PWA

A aplicação do paciente possui escopo `/`, enquanto a aplicação da equipe possui escopo `/monitoramento/`. Teste cada instalação em navegador e dispositivo distintos, verificando manifest, ícones, início standalone, atualização do Service Worker, cache estático, página offline e navegação após reconexão.

A geolocalização deve ser testada em contexto HTTPS confiável, com permissão concedida e negada, coordenadas disponíveis e timeout. A conectividade deve ser testada também por perda de rede real, e não apenas pelo estado visual do navegador.

## 17.11 Critérios de integração

A integração das aplicações deve confirmar:

- os dois frontends alcançam a API pela origem relativa;
- o token do paciente não é aceito em rotas da equipe;
- o token da equipe é validado pelo guard correspondente;
- eventos Socket.IO provocam atualização do feed por REST;
- requisições de emergência mantêm a mesma chave idempotente durante retries;
- PostgreSQL conserva ocorrências, resultados idempotentes e outbox;
- o dispatcher publica o evento para a equipe;
- migrations e seed são executados antes da disponibilidade da API.

## 17.12 Release

Uma release deve reunir build, lint, testes, validação Prisma, estado de migrations, configuração Compose, revisão de segredos e validação do ambiente de destino. Registre a revisão do código, a versão das ferramentas, os comandos executados e seus resultados.
