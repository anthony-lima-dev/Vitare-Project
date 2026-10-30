[🇧🇷 Português (Brasil)](README.md) | [🇺🇸 English](README.en.md)

<p align="center">
  <img src="Vitare/apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

# Vitare 2026

**Vitare** is a web platform made up of two installable PWA applications, a central API, and container-based infrastructure. The patient application organizes personal and clinical information and records emergency requests. The staff portal provides monitoring, assignment, and occurrence-management capabilities, along with role-authorized clinical lookup.

The repository is organized as a pnpm monorepo and brings together React, Vite, TypeScript, NestJS, Prisma ORM, PostgreSQL, Redis, Socket.IO, Docker Compose, and Cloudflare Tunnel.

> **Operational scope:** Vitare records and routes occurrences into the platform's internal monitoring workflow. It does not replace public emergency services, professional assessment, or medical care. The reviewed implementation does not contain direct operational integration with SAMU, hospitals, or government emergency coordination centers.

## Documentation

- [Documentação completa em português](Vitare/docs/pt/00-indice.md)
- [Full documentation in English](Vitare/docs/en/00-index.md)

The documentation covers architecture, applications, API, authentication, clinical domain, emergency workflows, offline synchronization, data, security, and deployment/operations procedures.

## Architecture overview

| Component | Directory | Responsibility |
|---|---|---|
| Patient application | `apps/web/` | Profile, clinical data, catalogues, contacts, emergency triggering, and PWA capabilities. |
| Staff portal | `apps/web-staff/` | Staff authentication, feed, handling, authorized lookup, and PWA capabilities. |
| API | `apps/api/` | Authentication, authorization, business rules, persistence, emergency processing, and events. |
| Shared types | `packages/core-typings/` | Contracts and types used by the applications. |
| Shared components | `packages/ui-components/` | Reusable React components. |
| Public infrastructure | `infra/public/` | Docker Compose, Nginx, production images, and Cloudflare Tunnel. |
| Local infrastructure | `infra/local/` | Local Docker Compose, LAN HTTPS, certificates, and database scripts. |

Both frontend applications have their own manifest and Service Worker. The patient application also maintains a read cache and an emergency outbox in IndexedDB. The staff application keeps its shell and static resources available, while acceptance, resolution, and lookup operations are executed through the API.

## Public deployment — primary procedure

Public deployment is defined under `infra/public/`. Traffic is received by Cloudflare and forwarded to Nginx through Cloudflare Tunnel. Nginx serves both frontends and proxies REST and Socket.IO traffic to the NestJS API. PostgreSQL and Redis remain on Docker networks without host-published ports.

```text
Browser (HTTPS)
   |
Cloudflare Edge (DNS/TLS)
   |
Cloudflare Tunnel (cloudflared)
   |
Nginx (web:80)
   |-- /                    -> patient application
   |-- /monitoramento/      -> staff portal
   |-- /api/                -> NestJS API (api:3000)
   `-- /socket.io/          -> Socket.IO (api:3000)
                                |
                         PostgreSQL 17
                         Redis 7
```

### Prerequisites

- Host running Docker Engine and the Docker Compose plugin.
- Domain managed by Cloudflare and a Tunnel created in Cloudflare Zero Trust.
- Dedicated credentials for PostgreSQL, JWT, cryptography, staff bootstrap, and enabled integrations.
- Google OAuth and Resend configuration when their respective flows are used.
- External PostgreSQL backup strategy and a tested restoration procedure.

The production environment uses Node.js 22 in Dockerfiles, pnpm `11.9.0`, PostgreSQL 17, Redis 7, and Nginx 1.29, according to the versioned infrastructure files.

### 1. Prepare environment variables

From the repository root:

```bash
cd infra/public
cp .env.public.example .env.public
chmod 600 .env.public
```

Edit `infra/public/.env.public` and replace every placeholder. Main groups:

| Group | Variables |
|---|---|
| PostgreSQL/Prisma | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `DIRECT_URL`, `POOLED_DATABASE_URL` |
| Application and origin | `VITE_API_URL`, `APP_URL`, `CORS_ORIGIN`, `PORT`, `NODE_ENV` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| Cloudflare | `TUNNEL_TOKEN` |
| JWT | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `STAFF_JWT_SECRET`, `STAFF_JWT_EXPIRES_IN` |
| Email | `RESEND_API_KEY`, `MAIL_FROM` |
| Redis and location | `REDIS_URL`, `REDIS_KEY_PREFIX`, `STAFF_GEO_KEY`, `STAFF_GEO_TTL_SECONDS` |
| Emergency | `EMERGENCY_IDEMPOTENCY_TTL_HOURS`, `EMERGENCY_SEARCH_RADIUS_M` |
| Provisioning | `STAFF_BOOTSTRAP_KEY` |
| Cryptography | `ENCRYPTION_KEY`, `BLINDED_INDEX_KEY`, `ENCRYPTION_KEY_ID` |
| Passwords | `BCRYPT_SALT_ROUNDS`, `PASSWORD_MIN_LENGTH`, `PASSWORD_MIN_RULES` |

The backend validates required variables during startup. In the reviewed configuration, the required set includes database connectivity, PII keys, JWT secrets, Google OAuth, and Resend. Consult `apps/api/src/config/configuration.ts` from the revision being deployed to confirm the required values.

Generate dedicated secrets for each environment. `ENCRYPTION_KEY` and `BLINDED_INDEX_KEY` must be different and must each contain exactly 32 bytes after Base64 decoding. Do not reuse development values, placeholders, or credentials supplied in test files.

### 2. Configure Cloudflare Tunnel

1. Create a Tunnel in Cloudflare Zero Trust.
2. Set `TUNNEL_TOKEN` in the protected `.env.public` file.
3. Configure the public hostname, for example `vitare.app.br`, to use origin `http://web:80`.
4. Keep the hostname consistent with Nginx `server_name` and healthcheck configuration.
5. Register the exact callback defined by `GOOGLE_CALLBACK_URL` in Google Console.

Public TLS terminates at Cloudflare Edge. The `cloudflared` connector establishes an outbound connection and forwards traffic to Nginx through Docker's `edge` network. The current Compose setup injects the token through `.env.public`; keep one source of configuration for this secret.

### 3. Validate and start

Still inside `infra/public/`:

```bash
make config
make up
make ps
make logs
```

To follow specific services:

```bash
make logs-api
make logs-tunnel
```

`make config` validates the resolved configuration; because environment values may be interpolated, run it in a private terminal and do not publish its output. `make up` builds and starts services in the background.

Startup order follows service dependencies: PostgreSQL must be healthy before migrations; the API depends on completed migrations and healthy Redis; Nginx depends on a healthy API; `cloudflared` depends on healthy Nginx.

### 4. Verify the environment after startup

- PostgreSQL: `pg_isready` healthcheck.
- Redis: `redis-cli ping` healthcheck.
- API: `GET /api/v1/health/ready`.
- Nginx: `/healthz` with the configured Host.
- Patient application: `https://YOUR_DOMAIN/`.
- Staff portal: `https://YOUR_DOMAIN/monitoramento/`.
- API: `https://YOUR_DOMAIN/api/v1`.
- Socket.IO: `https://YOUR_DOMAIN/socket.io/`.

After healthchecks, validate login, registration, OAuth callback, CORS, email delivery, clinical operations, idempotent triggering, outbox publication, staff feed, WebSocket, geolocation, and installation of both PWAs on real devices.

### 5. Load catalogues

After confirming database and migrations:

```bash
make seed
```

The `seed` target applies migrations and executes `apps/api/prisma/seed.ts`, which loads JSON files for diseases, code groups, and medications. Run it under a controlled procedure against the intended database and with a compatible backup available.

### 6. Provision the first staff account

Query `GET /api/v1/staff/auth/setup-status`. When no staff account exists, initial registration requires `STAFF_BOOTSTRAP_KEY`, supplied through the `X-Bootstrap-Key` header. After initial provisioning, new staff members are registered by an authenticated administrative actor.

### 7. Update and stop

```bash
make build
make pull
make restart
make down
```

`make down` removes containers and preserves named volumes. The `make down-v` target runs `docker compose down -v` and removes volumes, including persisted PostgreSQL data. Use it only when full environment and data removal is intentional.

## Local execution and development

The local environment is under `infra/local/`. It publishes Nginx on ports configured by `HTTP_BIND` and `HTTPS_BIND`, uses local certificates, and supports access by LAN IP/hostname.

```bash
cd infra/local
cp .env.example .env.local
chmod 600 .env.local
make build
make up
make ps
make logs
```

To install dependencies and start applications in development mode, run from the repository root:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile

pnpm dev:api
pnpm dev:patient
pnpm dev:staff
```

Quality commands:

```bash
pnpm build
pnpm lint
pnpm check:infra
pnpm --filter @vitare/api test
pnpm --filter @vitare/web test
pnpm --filter @vitare/web-staff test
pnpm exec playwright test
```

The API requires PostgreSQL, environment configuration, and the dependencies required at bootstrap. See [local infrastructure](Vitare/docs/en/14-local-infrastructure.md) and [development and testing](Vitare/docs/en/17-development-testing.md).

## Security for GitHub publication

The repository should contain only example files without credentials. Do not publish `.env`, `.env.local`, `.env.public`, Tunnel tokens, private keys, development certificates, or database dumps. Before making the repository public, review Git history, branches, tags, and CI artifacts. If any real secret has been shared, revoke or rotate the corresponding credential. Replacing AES/HMAC keys must be accompanied by a migration procedure for existing data and indexes.

Health information and personal identifiers processed by Vitare require appropriate access control, encryption, minimization, retention, and auditing. See [security and privacy](Vitare/docs/en/12-security-privacy.md).

## Repository structure

```text
apps/
  api/          NestJS, Prisma, modules, and integrations
  web/          patient PWA
  web-staff/    staff PWA
packages/
  core-typings/ shared contracts and types
  ui-components/ shared React components
infra/
  public/       public deployment, Nginx, and Cloudflare Tunnel
  local/        local/LAN environment, HTTPS, and scripts
docs/
  pt/           Brazilian Portuguese documentation
  en/           English documentation
```

## Technical documentation

- [Complete index](Vitare/docs/en/00-index.md)
- [Architecture](Vitare/docs/en/02-architecture.md)
- [Patient application](Vitare/docs/en/03-patient-application.md)
- [Staff portal](Vitare/docs/en/04-staff-portal.md)
- [REST API](Vitare/docs/en/05-api.md)
- [Identity and sessions](Vitare/docs/en/06-identity-sessions.md)
- [Clinical domain and catalogues](Vitare/docs/en/07-clinical-domain.md)
- [Emergency triggering](Vitare/docs/en/08-emergencies.md)
- [Offline operation and outboxes](Vitare/docs/en/09-offline-synchronization.md)
- [Realtime and Redis](Vitare/docs/en/10-realtime-redis.md)
- [Data model](Vitare/docs/en/11-data-model.md)
- [Security and privacy](Vitare/docs/en/12-security-privacy.md)
- [Public infrastructure](Vitare/docs/en/13-public-infrastructure.md)
- [Local infrastructure](Vitare/docs/en/14-local-infrastructure.md)
- [Configuration](Vitare/docs/en/15-configuration.md)
- [Operations, backup, and recovery](Vitare/docs/en/16-operations-backup.md)
- [Development and testing](Vitare/docs/en/17-development-testing.md)
