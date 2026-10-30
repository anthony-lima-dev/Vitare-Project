# 9. Offline operation, IndexedDB, and synchronization

[🇧🇷 Português (Brasil)](../pt/09-offline-sincronizacao.md) | [🇺🇸 English](09-offline-synchronization.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 9.1 Separate local capabilities

Vitare's offline strategy combines distinct mechanisms:

1. **Cache Storage:** static resources and application pages maintained by the Service Worker.
2. **IndexedDB read cache:** selected GET responses from the patient area, with scope and expiry.
3. **IndexedDB local outbox:** emergency operations persisted until API confirmation.
4. **PostgreSQL transactional outbox:** business events recorded in the occurrence transaction and processed later.

The Service Worker's static cache is not a clinical repository. The patient's local outbox is also not shared with the staff application.

## 9.2 Cache Storage and Service Worker

The patient Service Worker uses the `vitare-web-` cache prefix; the staff Service Worker uses `vitare-web-staff-`. Each cleans only caches associated with its own prefix, preserving the other application's scope.

Both use network-first for navigation and cache-first for static assets. API and authentication resources are excluded from caching strategies. The Service Worker does not implement native Background Sync; the application starts synchronization through connectivity, visibility, and client execution events.

## 9.3 IndexedDB

The patient application uses the `vitare-pwa-cache` database, version 2, with `responses` and `outbox` stores.

The `responses` store contains fields such as:

- local record key;
- user scope;
- corresponding URL;
- storage timestamp;
- expiration timestamp;
- structured response.

The `outbox` store has indexes by `ownerId`, state, and idempotency key. This organization allows the application to retrieve operations for a specific user, filter records by state, and enforce local key uniqueness.

## 9.4 Local outbox states

Each emergency operation has its own state:

| State | Meaning |
|---|---|
| `QUEUED` | Request persisted and awaiting synchronization. |
| `SYNCING` | Operation claimed by a submission attempt. |
| `SYNCED` | API confirmed occurrence registration. |
| `RETRY_WAIT` | Temporary failure; another attempt will occur after the calculated delay. |
| `FAILED_PERMANENT` | Failure classified as not automatically retryable. |

A `SYNCING` operation uses a local lease of approximately 30 seconds. An interrupted synchronization can be resumed from the persisted record using the same idempotency key.

## 9.5 Retry policy

The implementation defines up to five attempts, exponential backoff, and jitter, capped at 60 seconds. The queue differentiates failure types to choose retry behavior:

- network failures and timeouts: retry;
- identical operation still processing on the server: retry;
- key reused with different content: stop automatic retries;
- missing or invalid-format key: stop automatic retries;
- payload validation classified by the backend as input error: stop automatic retries;
- authentication responses: may be retried after token renewal or user reauthentication.

The attempt counter and `nextAttemptAt` determine operation eligibility.

## 9.6 User isolation

All synchronization queries filter by `ownerId`. The token used to submit an operation must belong to the same user recorded in the local item. During logout or account switching, local data is cleared according to session scope, and operations from a previous user must not be sent with another user's credentials.

## 9.7 Synchronization flow

1. The patient confirms the request.
2. The frontend creates an idempotency key and persists the operation as `QUEUED`.
3. The synchronizer retrieves eligible operations for the authenticated owner.
4. The operation is marked `SYNCING` before the HTTP call.
5. The client sends the payload with `X-Idempotency-Key`.
6. The API persists or retrieves the previous result.
7. After confirmation, the operation is marked `SYNCED` and stores the server-returned ID.
8. On temporary failure, the operation enters `RETRY_WAIT` and receives a new eligible timestamp.
9. On permanent failure or exhausted retry policy, the operation is marked `FAILED_PERMANENT`.

## 9.8 Idempotency between device and server

The key is created once for the logical operation. The frontend reuses the same key for every attempt. The backend combines user, scope, and key under a unique constraint and compares the payload fingerprint.

This mechanism connects local persistence to the server transaction. If connectivity is lost after the database has committed, retrying with the same key retrieves the stored response without creating another occurrence.

## 9.9 Server transactional outbox

The server outbox is persisted in PostgreSQL. Creating `OutboxEvent` occurs in the same transaction that registers the occurrence and idempotency result. Its initial state is `PENDING`.

`OutboxDispatcher` runs periodically:

1. queries `PENDING` events in creation order;
2. claims a batch and changes records to `PROCESSING`;
3. sets a processing deadline and increments the counter;
4. attempts to acquire a Redis lock for each event;
5. publishes the event through `EmergencyGateway`;
6. marks the record as `PUBLISHED`;
7. for trigger events, requests the occurrence transition to `NOTIFIED`.

The `FAILED` state represents a publication that reached the configured attempt limit. The business occurrence remains recorded independently of publication state.

## 9.10 Queue comparison

| Characteristic | Local outbox | Server outbox |
|---|---|---|
| Persistence | Device IndexedDB | PostgreSQL |
| Owner | Authenticated patient | Application/backend |
| Purpose | Deliver the request to the API | Publish events after commit |
| Key | Operation idempotency key | Persisted event ID |
| Confirmation | Valid API response | Publication executed by dispatcher |
| States | `QUEUED`, `SYNCING`, `SYNCED`, `RETRY_WAIT`, `FAILED_PERMANENT` | `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED` |

Both queues participate in the same business process, but have distinct storage, states, consumers, and responsibilities.
