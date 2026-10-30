# 1. Overview

[🇧🇷 Português (Brasil)](../pt/01-visao-geral.md) | [🇺🇸 English](01-overview.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 1.1 Purpose

Vitare is a web platform for organizing patient-provided clinical information and supporting the internal recording and monitoring of emergency requests. The solution has a patient-facing application, a professional staff portal, and an API responsible for centralizing business rules, authentication, authorization, persistence, and operational communication.

Both frontend applications are built with React, TypeScript, and Vite. Each has its own PWA capabilities. The backend uses NestJS, TypeScript, and Prisma ORM; data is persisted in PostgreSQL. Redis provides supporting capabilities for caching, GEO location, distributed locks, and rate limiting. Socket.IO transports operational notifications from the API to staff clients.

## 1.2 Actors and responsibilities

**Patient (`User`).** Creates and accesses an account; maintains profile data, chronic conditions, active medications, allergies, medication restrictions, and emergency contacts. A patient can start an emergency request and follow the corresponding record.

**Staff professional (`Staff`).** Accesses the monitoring portal according to their role. Views the occurrence feed, inspects operational details, accepts occurrences, records resolution, and, when authorized, looks up the patient's clinical record.

**Administrator.** Performs authorized administrative operations, including staff provisioning after the first account is created.

**External services.** Google provides federated patient authentication; Resend is used for email delivery; Cloudflare provides DNS, proxy, and Tunnel capabilities for public deployment.

## 1.3 Professional roles

The `StaffRole` enum contains:

| Role | Functional responsibility |
|---|---|
| `MEDICO_SOCORRISTA` | Operational access and authorized clinical lookup. |
| `ENFERMEIRO_SOCORRISTA` | Operational access and authorized clinical lookup. |
| `TECNICO_ENFERMAGEM` | Operational access and authorized clinical lookup. |
| `OPERADOR_TACTICAL` | Operational monitoring according to permissions, without full CPF-based clinical-record access. |
| `ADMINISTRATIVO` | Administration and authorized clinical lookup. |

Authorization is enforced by the backend. Hiding a button or frontend route does not replace identity and role validation in the corresponding endpoint.

## 1.4 Functional areas

1. **Identity and access:** local or Google registration, authentication, sessions, token renewal, and password recovery.
2. **Clinical profile:** profile data, chronic conditions, medications, change history, allergies, restrictions, and contacts.
3. **Catalogues:** searches over structured disease and medication reference data.
4. **Emergency:** optional location capture, request persistence, idempotency, occurrence creation, and lifecycle tracking.
5. **Monitoring:** occurrence feed, real-time event updates, acceptance, resolution, and authorized lookup.
6. **Governance:** legal-act records, clinical-lookup auditing, and protected identifier storage.

## 1.5 Service boundary

Vitare implements its own operational workflow: a patient records an occurrence and the API makes it available to the internal staff portal. Publishing an occurrence in Vitare does not, by itself, mean that a public emergency service has been contacted. The platform does not replace clinical assessment, professional care, or official public channels.

For real-world operation, the institutional process must define how internal monitoring relates to competent external services. System availability, connectivity, and the status displayed to users must be communicated unambiguously.

## 1.6 Emergency-process confirmations

Each stage has a distinct meaning:

- **Local persistence:** the request was stored on the patient's device.
- **API confirmation:** the occurrence was stored in PostgreSQL according to the endpoint response and transaction.
- **Operational publication:** the dispatcher emitted the event through Socket.IO.
- **Acceptance:** a professional accepted the occurrence.
- **Resolution:** the responsible professional recorded completion.

The UI must distinguish these stages. Local storage does not confirm server persistence, and event emission is not equivalent to human acknowledgement by staff.

## 1.7 Product components

| Component | Purpose |
|---|---|
| `apps/web` | Patient interface and related PWA capabilities. |
| `apps/web-staff` | Staff interface and PWA capabilities under `/monitoramento/`. |
| `apps/api` | API, use cases, integrations, and persistence. |
| `packages/core-typings` | Shared types and contracts. |
| `packages/ui-components` | Shared interface components. |
| `infra/public` | Public deployment stack. |
| `infra/local` | Local development and demonstration stack. |
