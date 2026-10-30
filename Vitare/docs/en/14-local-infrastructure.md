# 14. Local infrastructure

[🇧🇷 Português (Brasil)](../pt/14-infraestrutura-local.md) | [🇺🇸 English](14-local-infrastructure.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 14.1 Purpose

`infra/local/` provides an integrated environment for development, integration testing, and LAN demonstrations. Compose runs PostgreSQL, a migration service, Redis, NestJS API, and Nginx. The Nginx layer publishes the web applications and proxies requests to the API.

The local environment uses development certificates and publishes configured HTTP/HTTPS host ports. Public deployment uses Cloudflare Tunnel and does not publish application ports directly on the host.

## 14.2 Services and networks

Local Compose defines:

- `db`: PostgreSQL 17 with the `vitare_pg_data` volume;
- `migrate`: Prisma migration execution;
- `redis`: Redis 7 for cache and operational capabilities;
- `api`: NestJS application on internal port 3000;
- `web`: Nginx with both frontend builds and certificates mounted read-only.

The API joins the `edge` and `data` networks. Nginx uses `edge`, while database, migration, and Redis services use `data`. The named volume preserves PostgreSQL data across container recreations.

Compose does not publish PostgreSQL or Redis ports. Host ports are published by the `web` service according to `HTTP_BIND` and `HTTPS_BIND`.

## 14.3 Prepare the environment file

Inside `infra/local/`:

```bash
cp .env.example .env.local
chmod 600 .env.local
```

Configure PostgreSQL credentials, Prisma URLs, application origin, CORS, Google callback, JWT secrets, Redis, Resend, bootstrap key, and cryptographic keys. Also set `HTTP_BIND` and `HTTPS_BIND` to the network addresses that should receive connections.

For access from another LAN device, the domain/IP used in the browser must match the certificate and origin configuration.

## 14.4 HTTPS certificates

`infra/local/scripts/generate-certs.sh` uses `mkcert` to generate development certificates for localhost and/or the configured IP.

Example:

```bash
cd infra/local
./scripts/generate-certs.sh MACHINE_IP
```

The `vitare.crt` and `vitare.key` files are mounted into Nginx at `/etc/nginx/certs/`. The local certificate authority's root certificate must be trusted by the device accessing the application. On mobile phones, trust must be installed on the device itself.

Trusted HTTPS enables browser capabilities that require a secure context, such as PWA installation and geolocation.

## 14.5 Start services

Directly inside `infra/local/`:

```bash
docker compose --env-file .env.local -f compose.yaml up -d --build
docker compose --env-file .env.local -f compose.yaml ps
docker compose --env-file .env.local -f compose.yaml logs -f --tail=200
```

The local Makefile also provides:

```bash
make init
make build
make up
make ps
make logs
make restart
make down
make migrate
make backup
```

At the monorepo root, equivalent shortcuts include `pnpm infra:up`, `pnpm infra:down`, and `pnpm infra:logs`.

## 14.6 Application access

- Patient: `https://HOST/`.
- Staff: `https://HOST/monitoramento/`.
- API: `https://HOST/api/v1`.
- Socket.IO: `https://HOST/socket.io/`.

Local Nginx receives HTTP on port 80 and redirects to HTTPS on port 443. At the HTTPS endpoint, it serves patient and staff bundles and proxies API and WebSocket traffic to `api:3000`.

## 14.7 Local backups

`infra/local/scripts/backup-db.sh` creates a PostgreSQL custom-format dump. `restore-db.sh` restores a file using `pg_restore`. The scripts receive local environment configuration and should be run with a destination and data appropriate to the procedure.

Example:

```bash
cd infra/local
make backup
```

Restore uses options that clean existing objects. Before restoring, confirm the destination database and keep a compatible copy of the state being replaced.

## 14.8 Persistence and cleanup

`docker compose down` removes containers and preserves the named volume. `docker compose down -v` removes volumes and their data. The local `make clean` target removes the PostgreSQL volume.

Full cleanup is appropriate when recreating a demonstration environment; to preserve data between runs, use commands that do not remove volumes.

## 14.9 LAN usage

The address used by LAN devices must resolve to the host running Compose. The firewall should allow only the ports required for the demonstration. PostgreSQL and Redis remain accessible only through Docker networks; user interfaces access services through the same Nginx HTTPS origin.

## 14.10 Differences from public deployment

| Aspect | Local | Public |
|---|---|---|
| Ingress | Nginx published on host HTTP/HTTPS ports. | Cloudflare Tunnel to Nginx, with no host-published application ports. |
| Certificate | Locally generated development certificate. | TLS at Cloudflare edge. |
| Networks | Local Docker `edge` and `data` networks. | `edge`, `app`, and `data` networks, with `data` internal. |
| Persistence | `vitare_pg_data` volume. | `vitare_public_pg_data` volume. |
| Environment file | `.env.local`. | `.env.public`. |
| Use | Development, integration, and LAN demonstrations. | External publication. |
