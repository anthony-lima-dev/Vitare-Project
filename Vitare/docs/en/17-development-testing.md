# 17. Development and testing

[🇧🇷 Português (Brasil)](../pt/17-desenvolvimento-testes.md) | [🇺🇸 English](17-development-testing.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 17.1 Requirements

- Node.js 22.
- Corepack.
- pnpm `11.9.0`, declared by the root `package.json` `packageManager` field.
- Docker Engine and Docker Compose plugin for integrated environments.
- PostgreSQL and Redis available locally or through Compose for API tests.

## 17.2 Installation

From the monorepo root:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile
```

The workspace includes `apps/*` and `packages/*`. Use the versioned lockfile and keep the package manager at the declared version.

## 17.3 Development execution

The root `package.json` provides:

```bash
pnpm dev:api
pnpm dev:patient
pnpm dev:staff
```

These commands start the API, patient application, and staff portal. Frontends use the Vite proxy to forward `/api` to the local backend. The staff portal also configures a `/socket.io` proxy with WebSocket support.

The API requires variables defined as mandatory in `apps/api/src/config/configuration.ts`, along with PostgreSQL access. Redis is used when `REDIS_URL` is configured.

## 17.4 Monorepo build

The complete build is run with:

```bash
pnpm build
```

The sequence builds shared packages, the API, and frontends. The backend process generates Prisma Client before NestJS compilation. Each frontend runs a TypeScript build (`tsc -b`) followed by Vite build.

## 17.5 Lint and infrastructure check

```bash
pnpm lint
pnpm check:infra
```

`pnpm lint` runs ESLint in `apps/web`, `apps/web-staff`, and `apps/api`. `pnpm check:infra` runs `scripts/check-docker-build-context.mjs` to validate the build context structure used by Dockerfiles.

## 17.6 Prisma

Schema-maintenance commands are run in the API workspace:

```bash
pnpm --filter @vitare/api exec prisma validate
pnpm --filter @vitare/api exec prisma generate
pnpm --filter @vitare/api exec prisma migrate status
```

Prisma CLI uses `apps/api/prisma.config.ts`. The seed is defined in that file and points to `prisma/seed.ts`.

To apply migrations in the local environment:

```bash
cd infra/local
docker compose --env-file .env.local -f compose.yaml run --rm migrate
```

In the public environment, Compose runs the `migrate` service before the API.

## 17.7 Unit tests

The API uses Jest:

```bash
pnpm --filter @vitare/api test
```

The patient frontend uses Vitest:

```bash
pnpm --filter @vitare/web test
```

The staff portal also uses Vitest:

```bash
pnpm --filter @vitare/web-staff test
```

Tests cover use cases, components, adapters, encryption, persistence, and integration. Tests should be run in the environment corresponding to the dependencies required by each module.

## 17.8 Browser tests

The repository includes Playwright and configuration in `playwright.config.ts`. The available E2E test is under `tests/e2e/offline.spec.ts`.

Run:

```bash
pnpm exec playwright test
```

Browser validation should consider PWA installation, separate Service Worker scopes, offline navigation, IndexedDB, synchronization, authentication, and API communication.

## 17.9 Functional validation matrix

| Area | Checks |
|---|---|
| Registration and login | Local registration, Google OAuth, callback, and document acceptance. |
| Sessions | Renewal, refresh-token rotation, logout, and expiry. |
| Profile | Read and update patient data. |
| Clinical domain | Conditions, medications, history, allergies, restrictions, and contacts. |
| Catalogues | Disease/medication search and seed loading. |
| Emergency | With/without location, idempotency key, and server response. |
| Synchronization | Local persistence, recovery after connectivity, replay, and confirmation. |
| Staff | Login, feed, acceptance, resolution, and location. |
| CPF lookup | Canonicalization, authorized roles, and audit record. |
| Security | Encrypted fields, blind indexes, guards, and DTO validation. |
| PWA | Installation, Service Worker update, cache, and offline mode. |
| Infrastructure | Compose, migrations, healthchecks, Nginx, Tunnel, and WebSocket. |

## 17.10 PWA application tests

The patient application has `/` scope, while the staff application has `/monitoramento/` scope. Test each installation in separate browsers and devices, checking manifest, icons, standalone launch, Service Worker updates, static cache, offline page, and navigation after reconnection.

Geolocation should be tested in a trusted HTTPS context, with permission granted and denied, coordinates available, and timeout. Connectivity should also be tested by actual network loss, not only by the browser's visual status.

## 17.11 Integration criteria

Application integration should confirm:

- both frontends reach the API through the relative origin;
- patient tokens are not accepted on staff routes;
- staff tokens are validated by the corresponding guard;
- Socket.IO events trigger REST feed refresh;
- emergency requests keep the same idempotency key across retries;
- PostgreSQL stores occurrences, idempotency results, and outbox records;
- the dispatcher publishes events to staff;
- migrations and seed run before API availability.

## 17.12 Release

A release should include build, lint, tests, Prisma validation, migration status, Compose configuration, secret review, and validation in the target environment. Record the code revision, tool versions, commands, and their results.
