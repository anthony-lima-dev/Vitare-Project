# 13. Public infrastructure

[🇧🇷 Português (Brasil)](../pt/13-infraestrutura-publica.md) | [🇺🇸 English](13-public-infrastructure.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 13.1 Purpose

`infra/public/` contains the infrastructure intended for exposing Vitare to the Internet. The stack uses Docker Compose to coordinate PostgreSQL, migrations, Redis, NestJS API, Nginx, and Cloudflare Tunnel.

External ingress takes place through Cloudflare Tunnel. The host does not need to publish the internal ports of the API, PostgreSQL, or Redis. Nginx receives requests in the `web` container and routes each path to the corresponding service.

## 13.2 Ingress flow

The request path is:

1. The browser accesses the public domain over HTTPS.
2. Cloudflare receives the request and applies its configured DNS/proxy service.
3. The `cloudflared` connector maintains an outbound connection to the Cloudflare network.
4. Tunnel forwards the request to `web:80` on Docker's `edge` network.
5. Nginx serves static files or forwards the request to `api:3000`.
6. The API accesses PostgreSQL and Redis through internal Docker networks.

Nginx route mapping:

| Path | Destination |
|---|---|
| `/` | Patient application. |
| `/monitoramento/` | Staff application. |
| `/api/` | NestJS API. |
| `/socket.io/` | API Socket.IO gateway. |
| `/healthz` | Nginx healthcheck. |

## 13.3 Docker Compose services

`infra/public/compose.yaml` defines:

| Service | Image/build | Purpose |
|---|---|---|
| `db` | `postgres:17-bookworm` | PostgreSQL and persistent volume. |
| `migrate` | `Dockerfile.api`, `migrate` target | Runs Prisma migrations. |
| `redis` | `redis:7-bookworm` | Cache, GEO, locks, and throttling. |
| `api` | `Dockerfile.api`, `runtime` target | NestJS application on internal port 3000. |
| `web` | `Dockerfile.web` | Nginx and both frontend bundles. |
| `cloudflared` | `cloudflare/cloudflared` | Outbound Tunnel connection. |

The API is connected to the `app` and `data` networks; Nginx to `edge` and `app`; Cloudflare Tunnel to `edge`. PostgreSQL, Redis, and migrations use the `data` network, which has `internal: true`.

No service publishes host `ports`. Services use `expose` when internal communication ports need to be declared. The database stores its data in the named `vitare_public_pg_data` volume.

## 13.4 Dependency-based startup

The Compose dependency sequence organizes startup:

1. `db` starts and passes the `pg_isready` healthcheck.
2. `migrate` runs `prisma migrate deploy` after the database is healthy.
3. `redis` starts and passes the `redis-cli ping` healthcheck.
4. `api` starts after successful migration completion and Redis availability.
5. `web` starts after the API is healthy.
6. `cloudflared` starts after Nginx is healthy.

The API healthcheck uses `/api/v1/health/ready`. Nginx exposes `/healthz`, checked with the Host configured in its configuration file.

## 13.5 Environment preparation

From the monorepo root:

```bash
cd infra/public
cp .env.public.example .env.public
chmod 600 .env.public
```

The `.env.public` file contains runtime variables and is supplied to the services that require them. It must be populated with public-environment values and kept out of Git.

Configure database addresses for the Compose network, public origin, CORS, Google callback, Resend credentials, JWT secrets, bootstrap key, encryption keys, Redis connection, and Tunnel token.

The frontend image receives `VITE_API_URL` as a build argument. For same-origin deployment, the default value is `/api/v1`.

## 13.6 Cloudflare configuration

In Cloudflare Zero Trust, create a Tunnel and associate its token with `TUNNEL_TOKEN`. Configure the public hostname to forward to origin `http://web:80`. The supplied Nginx version uses `server_name vitare.app.br` and rejects unknown Host values.

When using another domain, keep the same hostname consistent in:

- public Tunnel hostname;
- Nginx `server_name` and Host validation;
- `APP_URL`;
- `CORS_ORIGIN`;
- `GOOGLE_CALLBACK_URL`;
- email links and other public URLs.

External TLS terminates at Cloudflare Edge. The connector establishes the outbound tunnel and reaches Nginx through Docker's `edge` network. Current Compose provides the token through `.env.public`; keep this as the single configuration source.

## 13.7 Nginx

Nginx uses `infra/public/nginx.conf`. Responsibilities include:

- reject unknown Host headers;
- serve the `apps/web` build at the root;
- serve the `apps/web-staff` build under `/monitoramento/`;
- proxy `/api/` to the API;
- proxy `/socket.io/` with WebSocket upgrade support;
- configure suitable timeouts and buffering for API and realtime;
- provide `/healthz`;
- add HTTP security headers;
- define cache policy for versioned assets and application resources.

Nginx receives both bundles compiled by `Dockerfile.web`, which builds shared packages and frontend applications.

## 13.8 Operational commands

The `infra/public/` Makefile defines `COMPOSE` using `.env.public` and `compose.yaml`.

| Command | Action |
|---|---|
| `make config` | Prints the resolved Compose configuration. |
| `make up` | Builds and starts services in the background. |
| `make ps` | Lists service state. |
| `make logs` | Follows logs for all services. |
| `make logs-api` | Follows API logs. |
| `make logs-tunnel` | Follows Cloudflare Tunnel logs. |
| `make restart` | Restarts services. |
| `make build` | Rebuilds images with base-image updates. |
| `make pull` | Pulls updated images. |
| `make seed` | Runs migrations and loads catalogues. |
| `make down` | Removes containers while preserving volumes. |
| `make down-v` | Removes containers and volumes. |

`make config` may interpolate environment variables into its output. Run it in a private environment and do not publish displayed values.

## 13.9 Migrations and catalogues

The `migrate` service runs `prisma migrate deploy`. The `make seed` target builds the migration image, runs migrations, and then executes `prisma/seed.ts`.

Seed imports disease, code-group, and medication datasets from project JSON files. Execution should be coordinated with database state and the catalogue update process.

## 13.10 Persistence and resources

PostgreSQL uses the persistent `vitare_public_pg_data` volume. Redis starts with `--appendonly no` and has no persistent volume declared in public Compose; it is used for operational and temporary data.

Compose defines per-service CPU and memory limits and container security options such as `no-new-privileges`. Container JSON logs have rotation configured by file size and count.

## 13.11 Publication and verification

After startup, validate:

- healthy state for `db`, `redis`, `api`, and `web`;
- DNS resolution and HTTPS certificate for the domain;
- `/` and `/monitoramento/`;
- `/api/v1/health/ready`;
- login and registration in both applications;
- OAuth callback and CORS;
- email delivery when enabled;
- Socket.IO communication;
- triggering, synchronization, and feed;
- installation and update of both PWAs.

Public deployment should have an external PostgreSQL backup, retention, monitoring, and restoration policy, along with secure storage for encryption keys. These procedures complement the Compose stack.
