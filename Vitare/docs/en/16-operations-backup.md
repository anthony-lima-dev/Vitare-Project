# 16. Operations, backup, and recovery

[🇧🇷 Português (Brasil)](../pt/16-operacao-backup.md) | [🇺🇸 English](16-operations-backup.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 16.1 Public-environment operations

The operational routine should monitor containers, healthchecks, host capacity, storage usage, Tunnel connectivity, migration state, database connections, API errors, and pending outbox events.

Commands from `infra/public/`:

```bash
make config
make up
make ps
make logs
make logs-api
make logs-tunnel
make restart
make build
make pull
```

These commands use the `.env.public` file and the `compose.yaml` in the current directory.

## 16.2 Healthchecks

The stack uses service-specific checks:

| Service | Check |
|---|---|
| PostgreSQL | `pg_isready` with configured user and database. |
| Redis | `redis-cli ping`. |
| API | HTTP request to `/api/v1/health/ready`. |
| Nginx | Request to `/healthz` with expected Host. |
| Cloudflare Tunnel | Connector state and `cloudflared` logs. |

API readiness considers dependencies defined by the health module. Operations should also monitor public-domain and Tunnel availability.

## 16.3 Logs

Compose configures the `json-file` driver with size and file-count rotation for services. `make logs`, `make logs-api`, and `make logs-tunnel` simplify event analysis by component.

Logs should prioritize timestamp, service, level, correlation identifier, and operational outcome. Credentials, tokens, form contents, full CPF, and clinical data must not be included in application logs.

## 16.4 PostgreSQL backup

Public PostgreSQL uses the named `vitare_public_pg_data` volume. The volume preserves data across container recreations, while backups must be stored independently from the runtime host.

The local environment provides `infra/local/scripts/backup-db.sh`, which creates a PostgreSQL custom-format dump. An equivalent procedure can be run in the public environment with `pg_dump`:

```bash
docker compose --env-file .env.public -f compose.yaml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backup-vitare.dump
```

The backup file contains personal and clinical information and must be encrypted, access-controlled, and subject to a defined retention period.

## 16.5 Restoration

The `infra/local/scripts/restore-db.sh` script uses `pg_restore` to restore custom-format dumps. Restoration must target a database explicitly selected for the procedure.

Conceptual example:

```bash
docker compose --env-file .env.local -f compose.yaml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner < backup-vitare.dump
```

Confirm the database, credentials, and file before execution. The `--clean` and `--if-exists` options replace existing objects in the target.

## 16.6 Cryptographic-key recovery

Restoring protected data depends on the keys used for encryption. Copies of `ENCRYPTION_KEY`, `BLINDED_INDEX_KEY`, and version identifiers must be preserved through a secure process separate from the database backup.

After restoration, validate connectivity, migrations, client generation, record decryption, and queries using blind indexes. Encrypted data must be recoverable with the key set corresponding to the stored envelopes.

## 16.7 Migrations

Deployment uses `prisma migrate deploy`. Before execution:

1. check the code and schema revision;
2. identify the pending migration;
3. confirm the target database;
4. maintain a consistent backup;
5. run the migration through the `migrate` service;
6. follow logs and healthchecks after completion.

`migrate deploy` applies versioned migrations. Database evolution must be coordinated with the API version consuming the schema.

## 16.8 Redis operations

Redis maintains supporting data for cache, location, locks, and throttling. Public Compose runs Redis without AOF and without a persistent volume. Business state remains in PostgreSQL; Redis is used for operational and temporary functions.

Operations should monitor memory use, availability, reconnects, latency, and GEO/lock key behavior.

## 16.9 Stack updates

To update images and applications:

```bash
cd infra/public
make pull
make build
make up
```

Image updates and migration execution should follow the deployment window defined by the operations owner. After deployment, validate healthchecks, domain, login, authorized clinical lookup, triggering, synchronization, feed, and WebSocket.

## 16.10 Environment shutdown

`make down` stops and removes containers while preserving named volumes. `make down-v` removes Compose volumes, including the PostgreSQL volume. In the local environment, `make clean` also removes the data volume.

Shutdown procedures must account for data retention and service continuity before running commands that remove volumes.
