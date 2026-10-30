# 10. Realtime communication and Redis

[🇧🇷 Português (Brasil)](../pt/10-tempo-real-redis.md) | [🇺🇸 English](10-realtime-redis.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 10.1 Socket.IO gateway

The emergency module registers `EmergencyGateway`, which exposes operational events through Socket.IO. The staff portal connection uses the staff authentication token in the handshake. The gateway validates the token signature and type, checks the identity's block state, and joins the authorized operational room.

Events related to the occurrence lifecycle include:

- `emergency.triggered`;
- `emergency.accepted`;
- `emergency.resolved`.

The dispatcher includes the event identifier (`eventId`) in the payload so consumers can recognize repetitions. Transmitted content is operational and does not replace authorized clinical-record lookup through the REST API.

## 10.2 Feed updates

The portal loads the feed through the REST API using `GET /api/v1/staff/emergencies`. The frontend uses TanStack Query to cache the result and refresh it periodically.

When a Socket.IO event arrives, the client invalidates the `staff-emergencies` query. The next REST read retrieves the latest persisted state. Polling every 15 seconds complements event-based updates and allows the portal to reconcile data when realtime connectivity is interrupted.

## 10.3 Redis responsibilities

Redis is used as supporting infrastructure for different operations:

| Use | Purpose |
|---|---|
| Cache | Reuse selected results with TTL. |
| Locks | Coordinate publication of outbox events. |
| Throttling | Shared request counters when enabled. |
| Temporary authentication/connection state | Query block status and operational coordination by module. |
| GEO | Store and query recent staff coordinates. |

The application uses `REDIS_URL` for connection and `REDIS_KEY_PREFIX` to organize keys. Redis unavailability is handled by adapters according to each service's responsibility.

## 10.4 Staff location

`POST /api/v1/staff/emergencies/location` receives latitude and longitude for the authenticated professional. The professional identifier is derived from the identity validated by the backend.

`RedisStaffGeoAdapter` uses GEO operations to add and query locations. An auxiliary per-professional record stores the update timestamp and TTL. The reference configuration uses `STAFF_GEO_TTL_SECONDS=300`; proximity queries use the radius configured by `EMERGENCY_SEARCH_RADIUS_M`, with 5,000 metres in the example.

Location is time-sensitive: timestamp and TTL determine whether the point is still within the expected operational window.

## 10.5 Patient location

Patient coordinates are sent in the occurrence payload when browser permission and device support allow capture. They are persisted on the occurrence as latitude and longitude, with decimal precision defined in the schema.

Patient and staff locations have different sources, purposes, and access rules. The operational feed may use the occurrence location to support handling, while recent staff position is retrieved through the GEO capability.

## 10.6 Networks and access

In public infrastructure, Redis belongs to the Docker `data` network, declared `internal: true`, and does not publish a host port. The API reaches Redis through the hostname defined in Compose. In the local environment, Redis also remains without a host port mapping.

## 10.7 Events and persistent source

Socket.IO transmission is event-driven and serves as a UI update mechanism. To retrieve the full occurrence state, the portal performs a REST read after receiving the signal. PostgreSQL retains business states and outbox records; Redis supports temporary operations and process coordination.
