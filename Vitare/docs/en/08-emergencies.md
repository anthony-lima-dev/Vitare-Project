# 8. Emergency triggering and processing

[🇧🇷 Português (Brasil)](../pt/08-emergencias.md) | [🇺🇸 English](08-emergencies.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 8.1 Starting a request

The flow starts in the patient application through the emergency action. The UI calls the `triggerEmergency` use case, which coordinates location capture and persistence of the request in the local outbox.

Location is optional. The browser requests the current position with a configured timeout; coordinates are validated by the domain before being added to the payload. If capture is unavailable, the UI may ask the patient for permission to continue without location.

The default payload contains `clientTriggeredAt` and, when available, `latitude` and `longitude`. The frontend does not need to submit the entire clinical record to the trigger endpoint: the backend can query the authenticated patient's persisted information to build the snapshot associated with the occurrence.

## 8.2 Local persistence before submission

The application stores the operation in IndexedDB with:

- local operation identifier;
- authenticated patient's `ownerId`;
- trigger payload;
- idempotency key;
- initial `QUEUED` state;
- attempt counter;
- creation and attempt timestamps;
- next eligible time;
- last error, when present.

This write allows the operation to remain on the device until the API confirms its registration. The same idempotency key is reused for retries of the same logical operation.

## 8.3 API request

The synchronizer sends `POST /api/v1/emergency/trigger` and includes `X-Idempotency-Key`. The global guard validates the patient session before the controller forwards data to `TriggerEmergencyUseCase`.

The use case checks:

1. presence of the idempotency key;
2. UUID format of the key;
3. latitude and longitude being supplied together;
4. valid geographic ranges for coordinates;
5. request-content fingerprint;
6. source of the clinical snapshot data.

Validation prevents latitude or longitude from being submitted alone and rejects coordinates outside valid ranges.

## 8.4 Clinical snapshot construction

When the payload does not contain a client-provided snapshot, the backend queries the patient's clinical data source within the application flow and builds `PatientSnapshot`. The snapshot captures the information available for the occurrence when it is received by the server, together with timing information related to the trigger.

When a client-provided snapshot is received, the use case builds it from allowed fields and identifies the content as client-supplied. This distinction preserves the provenance of the information.

The snapshot is associated with the occurrence so staff can retrieve the clinical context corresponding to the trigger time, even if the patient's profile is updated later.

## 8.5 Transaction and idempotency

`PrismaIdempotencyStore` implements persistent idempotency in PostgreSQL. The combination of user, scope, and key is unique. The request fingerprint is calculated and stored with the status and response payload.

For the first request, the service opens a transaction that:

1. creates the idempotency record in `IN_PROGRESS`;
2. executes the business operation;
3. creates the occurrence;
4. stores the related outbox event;
5. stores the idempotent result as `COMPLETED`;
6. commits the transaction.

If the same key is repeated with the same fingerprint, the system retrieves the previous result and indicates a replay. If the content differs, the service returns an idempotency conflict. Thus, repeating a request after a timeout does not need to create a second occurrence.

## 8.6 Occurrence record

The `EmergencyEvent` model contains:

- UUID identifier;
- patient's `userId`;
- `triggeredAt` timestamp;
- optional latitude and longitude;
- clinical snapshot;
- operational status;
- notes;
- optional `assignedStaffId`;
- acceptance timestamp;
- resolution timestamp.

The initial occurrence receives the `TRIGGERED` status. The patient record is maintained through a required relation to `User`; staff assignment remains optional until acceptance.

## 8.7 Handling lifecycle

The functional occurrence lifecycle uses `TRIGGERED`, `NOTIFIED`, `ACCEPTED`, and `RESOLVED`.

| State | Meaning |
|---|---|
| `TRIGGERED` | The occurrence was persisted after the request. |
| `NOTIFIED` | The operational event was published and the occurrence received the corresponding update. |
| `ACCEPTED` | A professional accepted the occurrence and was associated with the record. |
| `RESOLVED` | The responsible professional recorded completion of handling. |

The dispatcher may update an occurrence from `TRIGGERED` to `NOTIFIED` after publication. Acceptance associates the professional and records `acceptedAt`. Resolution records `resolvedAt` and changes the status to `RESOLVED`.

Updates are conditional on current state and authenticated identity to preserve assignment and handling order.

## 8.8 Acceptance and resolution by staff

Acceptance is performed through `POST /api/v1/staff/emergencies/:id/accept`. The backend validates the professional and current state, then performs a conditional update to assign the occurrence.

Resolution is performed through `POST /api/v1/staff/emergencies/:id/resolve`. The use case checks that the state is `ACCEPTED` and that the authenticated professional matches the assigned handler. The API persists the final state before the portal refreshes the feed.

## 8.9 Operational publication

Occurrence creation and Socket.IO publication are separate stages. The HTTP response confirms the business transaction result. The dispatcher consumes the outbox later and emits an operational event through `EmergencyGateway`.

Events include their own identifier (`eventId`) to support consumer-side deduplication. The payload is operational; staff retrieves current data through REST, with authorization enforced by the server.

## 8.10 Status shown to the patient

The experience should distinguish an operation saved on the device, a request awaiting synchronization, a record confirmed by the API, and subsequent operational state. `serverEventId` is populated when the response confirms the server occurrence. Staff publication and acceptance happen later and are retrieved through status updates.
