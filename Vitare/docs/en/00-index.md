# Vitare 2026 technical documentation

[🇧🇷 Português (Brasil)](../pt/00-indice.md) | [🇺🇸 English](00-index.md) | [Project README](../../README.en.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

This documentation describes Vitare based on the monorepo implementation, infrastructure files, and technical materials supplied to explain the system's processes and business rules.

## Navigation

1. [Overview](01-overview.md) — purpose, actors, responsibilities, and product scope.
2. [Architecture](02-architecture.md) — monorepo, layers, modules, and component communication.
3. [Patient application](03-patient-application.md) — routes, profile, clinical data, and PWA.
4. [Staff portal](04-staff-portal.md) — staff authentication, feed, handling, and clinical lookup.
5. [REST API](05-api.md) — endpoints, validation, contracts, and cross-cutting controls.
6. [Identity and sessions](06-identity-sessions.md) — registration, local/Google authentication, tokens, and password recovery.
7. [Clinical domain](07-clinical-domain.md) — health profile, conditions, medications, allergies, contacts, and catalogues.
8. [Emergencies](08-emergencies.md) — triggering, snapshot, assignment, and handling lifecycle.
9. [Offline operation](09-offline-synchronization.md) — IndexedDB, cache, local queue, idempotency, and asynchronous publication.
10. [Realtime and Redis](10-realtime-redis.md) — Socket.IO, feed, location, and Redis capabilities.
11. [Data model](11-data-model.md) — entities, relationships, constraints, Prisma, and PostgreSQL.
12. [Security and privacy](12-security-privacy.md) — authentication, authorization, encryption, auditing, and LGPD.
13. [Public infrastructure](13-public-infrastructure.md) — Cloudflare Tunnel, Nginx, Docker Compose, and publication.
14. [Local infrastructure](14-local-infrastructure.md) — development and LAN demonstration environment.
15. [Configuration](15-configuration.md) — environment variables, URLs, keys, and parameters.
16. [Operations and recovery](16-operations-backup.md) — healthchecks, logs, backups, restore, and maintenance.
17. [Development and testing](17-development-testing.md) — installation, execution, build, and validation.

## Conventions

- **Implementation:** behavior directly identified in source code or versioned configuration.
- **Configuration:** behavior defined by environment variables, credentials, networking, DNS, or provisioning.
- **Procedure:** operational sequence for carrying out a task in a local or public environment.

This documentation describes the project revision supplied for review. Before updating a branch, compare changes to code, schema, migrations, and Compose files, and update the corresponding documentation.

## Recommended reading order

Start with the overview and architecture. Then read the two application guides and the identity/emergency workflows. Data, security, and infrastructure documents explain persistence and platform operations. Public deployment is the primary path for external availability; `infra/local/` is intended for integrated development and controlled demonstrations.
