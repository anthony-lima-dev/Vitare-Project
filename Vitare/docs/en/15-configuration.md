# 15. Configuration and environment variables

[🇧🇷 Português (Brasil)](../pt/15-configuracao.md) | [🇺🇸 English](15-configuration.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 15.1 Reference files

The project has configuration templates separated by purpose:

- `apps/api/.env.example`: backend variables;
- `infra/local/.env.example`: local-environment configuration;
- `infra/public/.env.public.example`: public-environment configuration.

Actual environment files are created from these examples and must not be committed. Each environment should have its own values, especially database credentials, JWT tokens, cryptographic keys, and external-service credentials.

## 15.2 Database variables

| Variable | Purpose |
|---|---|
| `POSTGRES_DB` | Database name created by the PostgreSQL container. |
| `POSTGRES_USER` | Initial database user. |
| `POSTGRES_PASSWORD` | Database-user password. |
| `DATABASE_URL` | Connection URL used by Prisma CLI and migration configuration. |
| `DIRECT_URL` | Direct connection URL declared for administrative/Prisma tasks. |
| `POOLED_DATABASE_URL` | URL used by the PostgreSQL adapter at runtime. |

Within Compose, the internal service hostname is `db`. Do not replace it with `localhost` in URLs used between containers. The URL used by the browser is different from the database connection URL.

## 15.3 Application origin and CORS

| Variable | Purpose |
|---|---|
| `APP_URL` | Public origin used by application links and services. |
| `CORS_ORIGIN` | List of origins allowed to make CORS requests. |
| `VITE_API_URL` | API base URL embedded in the frontend build. |
| `PORT` | NestJS API HTTP port. |
| `NODE_ENV` | Node.js runtime profile. |
| `TRUST_PROXY` | Trust configuration for headers forwarded by proxies. |

For same-origin publication, `VITE_API_URL` uses `/api/v1`. Changing this value after the build requires rebuilding the web image because `VITE_*` variables are embedded in Vite-generated assets.

`APP_URL`, `CORS_ORIGIN`, and `GOOGLE_CALLBACK_URL` must represent the same public origin expected by the browser, accounting for callback routes.

## 15.4 Google OAuth

- `GOOGLE_CLIENT_ID`: OAuth application identifier.
- `GOOGLE_CLIENT_SECRET`: OAuth client secret.
- `GOOGLE_CALLBACK_URL`: return address registered in Google Console.

The callback must exactly match the address used by the backend. When changing domain or environment, update URLs in the environment file and provider registration.

## 15.5 JWT and passwords

| Variable | Purpose |
|---|---|
| `JWT_ACCESS_SECRET` | Signs patient access JWTs. |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime. |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime. |
| `STAFF_JWT_SECRET` | Signs staff JWTs. |
| `STAFF_JWT_EXPIRES_IN` | Staff-token lifetime. |
| `BCRYPT_SALT_ROUNDS` | Bcrypt processing cost. |
| `PASSWORD_MIN_LENGTH` | Minimum password length. |
| `PASSWORD_MIN_RULES` | Minimum number of password-policy criteria. |

Patient and staff secrets must be different, random, and unique per environment.

## 15.6 Email and provisioning

- `RESEND_API_KEY`: API key for email delivery.
- `MAIL_FROM`: sender used in messages.
- `STAFF_BOOTSTRAP_KEY`: key for creating the first staff account.

The sender should be configured for a domain verified with the provider. The bootstrap key is used during initial provisioning and must be protected as an administrative secret.

## 15.7 Redis and operational capabilities

| Variable | Purpose |
|---|---|
| `REDIS_URL` | Redis connection address. |
| `REDIS_KEY_PREFIX` | Key namespace prefix. |
| `STAFF_GEO_KEY` | Staff geospatial-index key. |
| `STAFF_GEO_TTL_SECONDS` | Freshness lifetime for location records. |
| `EMERGENCY_SEARCH_RADIUS_M` | Operational search radius in metres. |
| `EMERGENCY_IDEMPOTENCY_TTL_HOURS` | Validity window for idempotency records. |
| `THROTTLE_TTL` | Throttler time window in milliseconds. |
| `THROTTLE_LIMIT` | Request limit per window. |

Redis may be disabled in local development when `REDIS_URL` is unset. Adapters have their own behavior for caching and Redis-dependent operations.

## 15.8 Cryptography

| Variable | Purpose |
|---|---|
| `ENCRYPTION_KEY` | AES-256-GCM key for field encryption. |
| `BLINDED_INDEX_KEY` | HMAC-SHA-256 key for blind indexes. |
| `ENCRYPTION_KEY_ID` | Numeric key-version identifier. |

The two keys must be independent and decode to 32 bytes. Example generation in a secure environment:

```bash
openssl rand -base64 32
```

Run the command separately for each key. Do not reuse the same value for AES and HMAC. The key version is retained with the cryptographic envelope, while secret material remains outside the database and build artifacts.

## 15.9 Legal documents

Onboarding variables define versions and hashes for required documents:

- `TERMS_OF_USE_VERSION`;
- `TERMS_OF_USE_CONTENT_HASH`;
- `PRIVACY_NOTICE_VERSION`;
- `PRIVACY_NOTICE_CONTENT_HASH`.

The backend uses these values to identify which version must be accepted and record the corresponding hash. Updating published content requires updating the version and calculating a new hash from the actual text presented to users.

## 15.10 Local network variables

`HTTP_BIND` and `HTTPS_BIND` define the host addresses on which local Nginx publishes ports 80 and 443. For LAN demonstrations, the host must accept connections on the corresponding network interface and the firewall must allow the ports in use.

## 15.11 Configuration validation

Before starting Compose:

1. verify that all required variables are present;
2. check database URLs and hostnames for each network;
3. confirm that `APP_URL`, CORS, and callbacks are consistent;
4. confirm that cryptographic keys have the correct format and length;
5. validate Compose with `docker compose config`;
6. keep resolved configuration output in a private environment because it may contain interpolated secrets.

The backend performs fail-fast validation of required variables during bootstrap through `configuration.ts`.
