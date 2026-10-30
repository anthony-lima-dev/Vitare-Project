# 3. Patient application

[🇧🇷 Português (Brasil)](../pt/03-aplicacao-paciente.md) | [🇺🇸 English](03-patient-application.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 3.1 Responsibility

The patient application is located in `apps/web/` and uses React, TypeScript, Vite, and React Router. Its purpose is to provide an authenticated area where users manage their profile and clinical information, search catalogues, and submit emergency requests.

Backend communication uses the application's HTTP client and, in the default build, the relative `/api/v1` origin. During development, Vite proxies `/api` to `http://localhost:3000`.

## 3.2 Main routes

Routes are declared in `apps/web/src/App.tsx`.

| Route | Purpose |
|---|---|
| `/` | Public landing page. |
| `/login` | Patient authentication. |
| `/cadastro` | Local registration or entry into the Google flow. |
| `/esqueci-senha` | Request account recovery. |
| `/auth/reset-password` | Reset password using a token. |
| `/auth/google/callback` | Return from Google OAuth. |
| `/dashboard` | Patient-area overview. |
| `/completar-cadastro` | Profile completion and onboarding. |
| `/medicamentos` | Manage active medications and history. |
| `/doencas-cronicas` | Manage chronic conditions. |
| `/alergias` | Manage allergies. |
| `/contatos-emergencia` | Manage emergency contacts. |
| `/perfil` | Profile data and session actions. |

Authenticated pages are wrapped by `ProtectedRoute`. Legacy paths `/minha-saude/doencas-cronicas` and `/minha-saude/alergias` redirect to current paths, preserving compatibility with older links.

## 3.3 Patient profile

The profile is associated with the `User` model. The application manages identifying data and personal attributes such as blood type, weight, and height. Identifying data is sent to the API for protection and persistence; the UI works with the values required for the user experience.

The session maintains the identity of the authenticated patient. IndexedDB read cache is scoped by user, preventing a response stored for one account from being reused by another after a session change.

## 3.4 Clinical information

Clinical areas are organized by purpose:

- **Chronic conditions:** records associated with the patient and disease catalogue.
- **Medications:** name, dosage, frequency, period of use, notes, and active flag.
- **Medication history:** relevant changes made to medication records.
- **Allergies:** substance or description, severity, and notes.
- **Forbidden/restricted medications:** restrictions associated with medication-catalogue items.
- **Emergency contacts:** name, phone, relationship, and primary-contact flag.

Usage frequency is stored in the medication's `frequency` attribute. The separate schedules model was removed by migration `20261005180000_remove_medication_schedules`; the current format does not depend on an additional time-slot table.

## 3.5 Reference catalogues

The frontend calls disease and medication search endpoints. Catalogues are loaded by the backend from versioned JSON files under `apps/api/prisma/data/`. Selecting a catalogue item structures the clinical record; an item being present in a catalogue is not a prescription or therapeutic recommendation.

## 3.6 Patient PWA

Vite configures `vite-plugin-pwa` with the `injectManifest` strategy and a custom Service Worker at `apps/web/public/sw.ts`. The Service Worker is registered through the `SWRegister` component included in the application entrypoint.

The manifest defines:

- application name and short name;
- description and theme colors;
- `standalone` display mode;
- preferred portrait orientation;
- `/` scope and `/` start URL;
- icons in multiple sizes, including maskable variants.

The Service Worker uses the versioned `vitare-web-v1` cache, precaches build resources and `/offline.html`. Navigation uses network-first and, when offline, attempts to serve a previously cached page or the offline page. Static assets use cache-first.

Paths `/api/`, `/monitoramento/`, `/socket.io/`, `/auth/`, and `/emergency/` are excluded from local strategies. Authenticated clinical responses and tokens are not stored in Cache Storage.

## 3.7 IndexedDB read cache

The `vitare-pwa-cache` database has stores for responses and outbox operations. The read cache stores selected GET responses, scoped to a user and associated with validity timestamps. Covered resources include profile and clinical data required for display.

The policy is network-first: the current API response takes priority; local content may be used as a fallback when the network fails, provided it is still within its validity period. Authentication-denied or missing-resource responses must not be replaced with stale content. User scoping makes it possible to clear local data when the account changes or the session ends.

## 3.8 Emergency request

The emergency button invokes the `triggerEmergency` use case in the frontend application layer. The use case receives geolocation and outbox ports and does not directly depend on React components.

Geolocation is requested with a 15-second timeout and `maximumAge: 0`. Coordinates are validated before being added to the payload. When location cannot be obtained, the UI asks whether the patient wants to continue without coordinates. Confirmation continues the flow; cancellation creates no operation.

The frontend payload contains `clientTriggeredAt` and latitude/longitude when available. The operation is stored in the IndexedDB outbox before it is submitted to the API. After server confirmation, the local entry is marked `SYNCED` and may store the returned occurrence identifier.

## 3.9 Secure context

PWA installation, Service Worker, and geolocation require a secure context, normally HTTPS. In a local/LAN environment, the certificate must be trusted by the device accessing the application. The local infrastructure provides a procedure for generating development certificates.
