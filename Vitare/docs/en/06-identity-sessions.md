# 6. Identity, authentication, and sessions

[🇧🇷 Português (Brasil)](../pt/06-identidade-sessoes.md) | [🇺🇸 English](06-identity-sessions.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 6.1 Separate identities

The domain maintains two identity types: `User`, used by patients, and `Staff`, used by professionals. They are persisted separately and have distinct authentication flows, JWT strategies, and authorization rules.

Patient and staff tokens are not interchangeable. A staff token contains the `staff` type indicator; the dedicated strategy and guards validate this context before granting access to staff-portal endpoints.

## 6.2 Authentication-method selection

`POST /api/v1/auth/login/check-realm` receives an email and canonicalizes it using trim and lowercase conversion. `gmail.com` and `googlemail.com` addresses are routed to Google authentication. For other domains, the API checks the existing account link and returns the local method when the account is not associated with Google.

This stage selects the authentication experience that the UI should initiate. Domain checking does not replace identity validation performed by the provider or password verification.

## 6.3 Local registration

Local registration receives full name, email, password, and acceptance records for the required legal documents. `AuthService.register` validates current documents before creating the account. User persistence and legal-act recording are coordinated by the repository in one transaction.

The password is converted into a bcrypt hash using the cost configured by `BCRYPT_SALT_ROUNDS` (12 in the example). The original value must not be persisted. After creation, the API issues an access token and a refresh token.

## 6.4 Local login

Login retrieves the account by email and verifies the submitted password against the stored bcrypt hash. After validation, the backend issues the token pair. Issuing the refresh token also stores its SHA-256 hash in PostgreSQL, together with the associated identity, expiration date, and creation timestamp.

## 6.5 Google OAuth

The federated flow takes place in stages:

1. The UI requests OAuth initiation.
2. The API redirects the browser to Google.
3. The provider authenticates the person and returns to the configured callback.
4. The backend validates the returned profile and locates or creates the `User` identity.
5. The API issues the token pair and creates a temporary exchange code.
6. The browser receives the temporary code and calls `POST /api/v1/auth/google/exchange`.
7. The service consumes the code once and returns the tokens to the frontend.
8. The frontend fetches the current profile and routes the user to the authenticated area or profile completion.

`GoogleAuthSessionService` stores the hash of the temporary code, associates it with the token pair, and applies a 60-second TTL. The original code is sent to the client, but only its hash is used as the internal key. When consumed, the in-memory entry is removed.

## 6.6 Sessions and tokens

The access token is a JWT signed with `JWT_ACCESS_SECRET`. Its default reference lifetime is 15 minutes. The refresh token is opaque, randomly generated, and stored in the database only as a hash. The reference refresh-token lifetime is 7 days. Staff uses `STAFF_JWT_SECRET` and `STAFF_JWT_EXPIRES_IN`, with 2 hours in the configuration example.

The client application stores tokens according to its session implementation. Authenticated HTTP requests attach the access token in the Authorization header. When the API indicates session expiration, the client may request renewal through the dedicated endpoint.

## 6.7 Refresh-token renewal and rotation

`POST /api/v1/auth/refresh` receives the current refresh token. The backend hashes it and asks the repository to perform an atomic rotation. The operation consumes the previous token and stores the successor hash with a new expiration.

Only one concurrent request should be able to consume the same token. When an already-used token is presented again, the result is treated as credential reuse and the backend policy terminates the session family. The client must replace the refresh token with the returned successor and use the new pair for subsequent requests.

## 6.8 Logout

`POST /api/v1/auth/logout` revokes the submitted refresh token. Local cleanup removes the browser session and related offline data according to the application's policy. Revoking a refresh token prevents further renewals with that value; an already-issued access JWT retains its cryptographic validity until expiration unless the server applies an additional revocation check.

## 6.9 Password recovery and reset

`POST /api/v1/auth/forgot-password` receives the email and returns a generic response regardless of whether the account exists, preventing direct account enumeration.

For an existing account, the backend generates an opaque token, stores only its SHA-256 hash, and sets a one-hour lifetime. Resend delivers a message with a link to `/auth/reset-password`.

Password reset uses `POST /api/v1/auth/reset-password`. The backend looks up the token hash, verifies validity and previous use, computes a new bcrypt hash, and consumes the token. Password change and revocation of active refresh tokens are performed in the same repository transaction.

## 6.10 Staff provisioning

The first staff account is created using `STAFF_BOOTSTRAP_KEY`, supplied through the `X-Bootstrap-Key` header. `GET /api/v1/staff/auth/setup-status` reports whether initial creation is still required.

The bootstrap process protects the initial account claim against concurrent requests. After this stage, registering new professionals requires an authenticated administrative identity. Each professional receives a role defined by the `StaffRole` enum.

## 6.11 Onboarding legal acts

The `legal` module stores versioned records for required documents, such as Terms of Use and Privacy Notice. Each record includes document type, version, content hash, purpose, legal basis, origin, actor, holder, IP hash when applicable, and recording timestamp.

Document version and hash associate the user's action with the specific version shown during onboarding. The business flow treats these records as append-only, preserving the history of acceptances.
