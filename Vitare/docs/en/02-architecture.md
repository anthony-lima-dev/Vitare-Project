# 2. Architecture

[🇧🇷 Português (Brasil)](../pt/02-arquitetura.md) | [🇺🇸 English](02-architecture.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 2.1 Monorepo

The repository uses pnpm workspaces and organizes applications and shared packages in one project:

```text
TCC-Vitare_2026/
├── apps/
│   ├── api/                 # NestJS, Prisma, and backend rules
│   ├── web/                 # patient PWA
│   └── web-staff/           # staff PWA
├── packages/
│   ├── core-typings/        # shared types and contracts
│   └── ui-components/       # reusable React components
├── infra/
│   ├── public/              # public Compose and Cloudflare Tunnel
│   └── local/               # local Compose and certificates
├── scripts/                 # checks and utilities
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

The root `package.json` declares `pnpm@11.9.0`. The workspace includes `apps/*` and `packages/*`, enables local dependencies, and aligns React type versions through overrides. Dockerfiles use Node.js 22 and Corepack to prepare the package manager.

## 2.2 NestJS backend

The API lives in `apps/api/`. `AppModule` composes the registered functional modules:

- `auth`
- `patients`
- `conditions`
- `medications`
- `contacts`
- `emergency`
- `health`
- `disease-dictionary`
- `medications-dictionary`
- `allergies`
- `forbidden-medications`
- `staff`
- `legal`

These modules are complemented by shared infrastructure for Prisma, Redis, encryption, throttling, exception filters, and configuration. The `modules/clinical` folder also contains supporting code/tests related to clinical encryption, but it is not an additional module registered in `AppModule`.

The `main.ts` bootstrap creates the NestJS application, configures Helmet and compression, defines CORS from `CORS_ORIGIN`, sets the `/api` prefix, and enables URI versioning with default version `1`. The API is exposed under `/api/v1` on the port defined by `PORT` (3000 in Compose).

The global `ValidationPipe` uses `whitelist`, `forbidNonWhitelisted`, and `transform`, as well as implicit type conversion. DTOs therefore control input shape and undeclared properties are rejected. Global filters handle domain and Prisma persistence errors.

## 2.3 Clean Architecture

The implementation organizes responsibilities into layers consistent with Clean Architecture:

| Layer | Responsibility | Project examples |
|---|---|---|
| `presentation` | Receive and expose interactions | HTTP controllers, DTOs, guards, and Socket.IO gateway. |
| `application` | Orchestrate use cases | Application services, use cases, and ports. |
| `domain` | Business rules and concepts | Entities, types, value objects, and repository contracts. |
| `infrastructure` | Technical implementations | Prisma, Redis, encryption, email, and external-service adapters. |

Business rules should remain independent from transport and persistence details. Use cases consume contracts defined in inner layers; concrete adapters implement those contracts. NestJS composes providers and dependencies during startup.

## 2.4 DDD and business contexts

Module separation organizes responsibilities by context: identity and authentication, patients, clinical conditions, medications, contacts, emergency, staff, catalogues, and legal acts. Each context groups its controllers, application rules, domain elements, and adapters according to functional requirements.

This separation allows changes in one context to be assessed without automatically transferring responsibilities to every other context. Dependencies between modules should use explicit contracts and avoid cycles.

## 2.5 Independent frontends

`apps/web` and `apps/web-staff` are separate React applications. Each has its own `App.tsx`, entrypoint, router, HTTP client, session context, Vite configuration, and Service Worker.

The patient frontend uses routes at the domain root. The staff portal uses `base: /monitoramento/` in Vite and `basename="/monitoramento"` in `BrowserRouter`. Both applications call the API through the same relative `/api/v1` origin in the default build.

Separate bundles and Service Worker scopes allow each application to have its own update and cache lifecycle. Authentication and authorization remain under API control.

## 2.6 Shared packages

`@vitare/core-typings` centralizes types used by more than one application, including API contracts and related structures. `@vitare/ui-components` provides reusable React components. Dockerfiles build these packages before the API and frontends so their `dist` artifacts are available during the image build.

## 2.7 Persistence and supporting services

- **PostgreSQL:** persistent source for users, staff, clinical data, occurrences, tokens, legal records, and outbox.
- **Prisma ORM:** model mapping, client generation, and migrations.
- **Redis:** cache, GEO, locks, and throttling storage when enabled.
- **Socket.IO:** operational event publication to staff.
- **Google OAuth:** federated patient authentication.
- **Resend:** email delivery.
- **Cloudflare Tunnel:** public ingress without publishing application ports on the host.

## 2.8 Monorepo build sequence

The `pnpm build` command compiles shared packages before their consumers:

1. `@vitare/core-typings`;
2. `@vitare/ui-components`;
3. `@vitare/api`;
4. `@vitare/web`;
5. `@vitare/web-staff`.

`pnpm lint` runs ESLint across the three applications. `pnpm check:infra` runs `scripts/check-docker-build-context.mjs` to validate the Docker build context.
