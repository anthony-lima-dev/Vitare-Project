# 5. REST API

[🇧🇷 Português (Brasil)](../pt/05-api.md) | [🇺🇸 English](05-api.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 5.1 Address and versioning

The backend uses the global `/api` prefix and URI versioning with default version `1`. Application endpoints are therefore under `/api/v1`. Frontend HTTP clients use the relative `/api/v1` origin; in development, Vite proxies `/api` to the local API on port 3000.

In public and local environments, Nginx proxies `/api/` to the `api:3000` service. Socket.IO requests are forwarded separately through `/socket.io/`, preserving the WebSocket upgrade.

## 5.2 Request pipeline

An HTTP request follows these general stages:

1. Nginx receives the connection and forwards the route to the API.
2. NestJS applies global authentication and throttling guards.
3. The authentication strategy validates the token when the endpoint requires a session.
4. Guards and use-case rules verify identity type, role, and resource ownership.
5. The controller transforms HTTP input into parameters/DTOs and calls a service or use case.
6. The application layer coordinates domain rules and contracts.
7. Infrastructure adapters execute Prisma queries/transactions, access Redis, and call external services.
8. The response passes through exception filters and returns to the client.

The global `ValidationPipe` uses `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`, with implicit type conversion enabled. DTOs therefore define the input contract, and undeclared fields are rejected.

## 5.3 Patient authentication endpoints

Controller: `AuthController`. Prefix: `/api/v1/auth`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/login/check-realm` | Determines authentication strategy for an email. |
| `POST` | `/register` | Creates a local account, records required legal acts, and issues tokens. |
| `POST` | `/login` | Validates local credentials and starts a session. |
| `POST` | `/refresh` | Renews and rotates the refresh token. |
| `POST` | `/logout` | Revokes the supplied refresh token. |
| `GET` | `/google` | Starts OAuth redirect. |
| `GET` | `/google/callback` | Receives provider callback. |
| `POST` | `/google/exchange` | Consumes temporary code and returns tokens. |
| `POST` | `/forgot-password` | Requests a reset link. |
| `POST` | `/reset-password` | Validates token and changes password. |

## 5.4 Patient profile

Controller: `PatientsController`. Prefix: `/api/v1/patients`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/me` | Retrieves the profile associated with the authenticated user. |
| `PUT` | `/me` | Updates allowed fields of the current profile. |
| `DELETE` | `/me` | Executes deletion according to backend rules. |

The user identifier is derived from the authenticated identity. A client must not freely choose another `userId` to access a profile.

## 5.5 Clinical endpoints

| Context | Method and endpoint | Description |
|---|---|---|
| Conditions | `GET /conditions` | Lists the authenticated patient's conditions. |
| Conditions | `POST /conditions` | Creates a condition record. |
| Conditions | `DELETE /conditions/:id` | Removes an owned record according to domain rules. |
| Medications | `GET /medications` | Lists medications. |
| Medications | `POST /medications` | Creates a medication record. |
| Medications | `PATCH /medications/:id` | Updates medication information. |
| Medications | `DELETE /medications/:id` | Removes an allowed record. |
| History | `GET /medications/:id/history` | Retrieves medication history. |
| Allergies | `GET /allergies` | Lists allergies. |
| Allergies | `POST /allergies` | Creates an allergy record. |
| Allergies | `DELETE /allergies/:id` | Removes an allergy. |
| Contacts | `GET /emergency-contacts` | Lists contacts. |
| Contacts | `POST /emergency-contacts` | Creates a contact. |
| Contacts | `DELETE /emergency-contacts/:id` | Removes a contact. |
| Restrictions | `GET /forbidden-medications` | Lists restrictions. |
| Restrictions | `POST /forbidden-medications` | Creates a restriction. |
| Restrictions | `DELETE /forbidden-medications/:id` | Removes a restriction. |
| Catalogue | `GET /disease-dictionary` | Searches diseases. |
| Catalogue | `GET /medications-dictionary` | Searches medications. |

Personal and clinical-data endpoints must validate identity and restrict queries to the authenticated patient, except for explicitly authorized staff operations.

## 5.6 Emergency endpoints

Controller: `EmergencyController`. Prefix: `/api/v1/emergency`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/trigger` | Records an emergency request. Requires `X-Idempotency-Key`. |
| `GET` | `/` | Lists occurrences associated with the authenticated patient. |

The idempotency key is mandatory for triggering and must be a UUID. The same key and payload allow the original result to be retrieved on retry. Reusing a key with different content results in a conflict.

## 5.7 Staff endpoints

Staff controllers use the `/api/v1/staff` prefix.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/me` | Retrieves the authenticated professional identity. |
| `GET` | `/auth/setup-status` | Checks initial provisioning status. |
| `POST` | `/auth/login/check-realm` | Determines authentication method. |
| `POST` | `/auth/register` | Provisions a professional according to access rules. |
| `POST` | `/auth/login` | Authenticates a professional. |
| `GET` | `/emergencies` | Retrieves recent occurrences. |
| `POST` | `/emergencies/:id/accept` | Accepts an occurrence. |
| `POST` | `/emergencies/:id/resolve` | Records resolution. |
| `POST` | `/emergencies/location` | Updates the professional's operational location. |
| `GET` | `/patients?cpf=...` | Looks up a patient according to role. |

## 5.8 Legal acts and health checks

The legal module exposes `POST /api/v1/legal-acts`, `GET /api/v1/legal-acts/holder/:holderId`, and `GET /api/v1/legal-acts/actor/:actorId`.

The health module exposes:

- `GET /api/v1/health`: general check;
- `GET /api/v1/health/live`: process liveness;
- `GET /api/v1/health/started`: startup completion;
- `GET /api/v1/health/ready`: readiness of required dependencies.

Compose uses `/api/v1/health/ready` for the API healthcheck.

## 5.9 CORS, proxy, and headers

CORS is configured through `CORS_ORIGIN`, with credentials enabled. `TRUST_PROXY` controls whether Express trusts forwarded headers. In production, its value must match known proxy hops, including the actual path between Cloudflare Tunnel, Nginx, and the API.

Helmet adds HTTP security headers, and Nginx defines additional headers for content type, referrer, framing, and permissions. Public configuration allows same-origin geolocation through the `Permissions-Policy` directive.

## 5.10 Rate limiting

The global throttler uses `THROTTLE_TTL` and `THROTTLE_LIMIT`, defaulting to 60,000 milliseconds and 100 requests per window. `RedisThrottlerStorage` provides shared counters when Redis is available and falls back to per-process storage when the shared service is inactive. Sensitive route protection must be assessed together with the global limit and infrastructure capacity.

## 5.11 Response contracts

Clients should handle HTTP statuses and backend-defined error codes instead of relying only on message text. Relevant outcomes include:

- `400`/`422`: invalid input or validation failure;
- `401`: missing, invalid, expired, or rejected authentication;
- `403`: authenticated identity without permission for the operation;
- `404`: resource not found within the allowed scope;
- `409`: state, concurrency, or idempotency conflict;
- `429`: rate limit reached;
- `5xx`: processing or dependency failure.

Specific DTOs and exception filters in the running revision define the effective response body.
