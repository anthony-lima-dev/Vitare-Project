# 4. Staff monitoring portal

[🇧🇷 Português (Brasil)](../pt/04-portal-equipe.md) | [🇺🇸 English](04-staff-portal.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 4.1 Responsibility and base path

The portal is located in `apps/web-staff/` and is an independent React + Vite application. Its deployment base is `/monitoramento/`; Vite defines `base: "/monitoramento/"`, and `BrowserRouter` uses `basename="/monitoramento"`.

Staff has its own authentication context, separate from the patient context. The portal maintains its own Service Worker and PWA manifest scoped to `/monitoramento/`.

## 4.2 Routes

Routes are declared in `apps/web-staff/src/App.tsx`:

| Route | Purpose |
|---|---|
| `/monitoramento/` | Application entry and session/provisioning check. |
| `/monitoramento/login` | Staff authentication. |
| `/monitoramento/cadastro` | Initial provisioning or administrative registration. |
| `/monitoramento/emergencias` | Operational feed and handling actions. |
| `/monitoramento/pacientes` | Authorized patient lookup. |

The portal uses paths relative to its configured base. Nginx exposes `/monitoramento` and redirects to `/monitoramento/`, preserving the path expected by Vite and the router.

## 4.3 Staff PWA

`apps/web-staff/vite.config.ts` uses `vite-plugin-pwa` with the `injectManifest` strategy and `apps/web-staff/public/sw.ts` as its Service Worker. The manifest defines `scope`, `start_url`, and identifier under `/monitoramento/`, together with its own icons.

Its versioned cache uses the `vitare-web-staff-` prefix. The Service Worker precaches build resources and the staff offline page, applies network-first to navigation and cache-first to static assets. API, Socket.IO, authentication, and staff authentication paths are excluded from caching.

The portal Service Worker keeps the application shell and static resources available. Accepting, resolving, and querying clinical records are backend operations and require API connectivity.

## 4.4 Authentication and roles

The `Staff` entity represents professionals. The staff flow uses dedicated endpoints under `/api/v1/staff/auth` and tokens signed with `STAFF_JWT_SECRET`. The token includes the `staff` identity type; dedicated guards and strategies validate the staff context.

Available roles are `MEDICO_SOCORRISTA`, `ENFERMEIRO_SOCORRISTA`, `TECNICO_ENFERMAGEM`, `OPERADOR_TACTICAL`, and `ADMINISTRATIVO`. Permissions are enforced by the backend regardless of which elements are displayed in the UI.

## 4.5 Emergency feed

The feed is retrieved through `GET /api/v1/staff/emergencies`. The frontend uses TanStack Query under the `staff-emergencies` key, with a usual limit of 50 occurrences and periodic refresh every 15 seconds.

In parallel, the Socket.IO client connects to the API using the staff session. The gateway validates the token and joins the authorized operational room. When the frontend receives an event, it invalidates the feed query; the subsequent read uses REST and returns the latest persisted state.

Socket.IO is a change-notification channel. REST API and PostgreSQL remain the reference for current occurrence data.

## 4.6 Accepting an occurrence

The professional selects an occurrence and requests acceptance through `POST /api/v1/staff/emergencies/:id/accept`. The API identifies the professional from the session, checks state conditions, and performs the assignment conditionally. The conditional update prevents two concurrent requests from assigning the same occurrence to different professionals.

After the response, the portal revalidates the feed to reflect the confirmed assignment. The professional identifier must not be freely supplied by the browser; the backend derives identity from the validated token.

## 4.7 Resolution

Resolution is requested through `POST /api/v1/staff/emergencies/:id/resolve`. The use case checks whether the occurrence is in an eligible state and whether the authenticated professional is the assigned handler. The operation records the resolution timestamp and changes the state to `RESOLVED`.

## 4.8 Operational location

`POST /api/v1/staff/emergencies/location` receives coordinates for the authenticated professional. `RedisStaffGeoAdapter` uses Redis GEO commands and a freshness record with TTL. The environment example uses 300 seconds for location freshness; the example operational radius is 5,000 metres.

Location is operational data and must be used according to the permissions and purpose established for staff.

## 4.9 CPF lookup

The portal exposes lookup through `/api/v1/staff/patients?cpf=...`. The API authenticates the professional, checks the role, and canonicalizes the CPF. The repository queries the HMAC blind index associated with the CPF, without using the original value as the lookup key.

Full lookup is allowed to physicians, nurses, nursing technicians, and administrators. `OPERADOR_TACTICAL` does not have full clinical-record access through the current use case.

Lookup outcomes distinguish patient found (`FOUND`), not found (`NOT_FOUND`), and denied request (`DENIED`). Audit recording is performed through the `PatientLookupAuditPort` adapter.

## 4.10 Staff provisioning

`GET /api/v1/staff/auth/setup-status` reports whether the first staff account still needs to be created. Initial registration uses `STAFF_BOOTSTRAP_KEY`, supplied through the `X-Bootstrap-Key` header. The repository coordinates initial creation to prevent two requests from claiming the first account concurrently.

After initial provisioning, registration of new professionals requires an authenticated administrator. The bootstrap key must remain protected and be managed as an operational secret.
