# 12. Security and privacy

[🇧🇷 Português (Brasil)](../pt/12-seguranca-privacidade.md) | [🇺🇸 English](12-security-privacy.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 12.1 Protection layers

Vitare security is distributed across browser, API, persistence, and infrastructure. The application uses token-based authentication, identity/role authorization, DTO validation, request throttling, sensitive-field protection, separate Docker networks, and audit records.

The patient application and staff portal have separate session contexts. The API validates these contexts for every protected operation; authorization does not depend only on frontend routing or component visibility.

## 12.2 Passwords

Local passwords are processed with bcrypt through backend hashing utilities. The value stored in `User.passwordHash` or `Staff.passwordHash` is the password hash. Cost is configured by `BCRYPT_SALT_ROUNDS`, with reference value 12.

Password policy uses parameters such as `PASSWORD_MIN_LENGTH` and `PASSWORD_MIN_RULES`. Validation must occur on the backend even when the frontend also displays password requirements.

## 12.3 Tokens

The access token is a JWT. Patient and staff signing secrets are separate (`JWT_ACCESS_SECRET` and `STAFF_JWT_SECRET`). Expiration periods are configurable.

Refresh tokens are opaque, randomly generated values. The database stores their SHA-256 hash rather than the original token. Password-reset tokens follow the same principle: an opaque token is sent by email and its hash is persisted in PostgreSQL.

Identity-type checks prevent a patient token from being used on staff endpoints and vice versa. Tokens and credentials must not appear in logs, analytics, telemetry, URL parameters, or versioned files.

## 12.4 Field encryption

`SensitiveFieldEncryptionService` implements AES-256-GCM. Configuration uses a 32-byte Base64-encoded key. Each operation generates a random 12-byte IV and uses a 16-byte authentication tag.

The cryptographic envelope contains:

- format version;
- key identifier (`keyId`);
- IV;
- ciphertext;
- authentication tag.

The implementation uses AAD `vitare-pii-v1` and validates the version and key identifier during decryption. Modified data or ciphertext incompatible with the key must not be treated as valid content.

## 12.5 Blind indexes

For fields that need equality lookup, the service uses HMAC-SHA-256 with a key separate from the AES key. Canonicalization functions normalize values before generating the index:

- email: trim and lowercase;
- CPF: digits only;
- phone: digits only;
- full name and address: trim and normalize whitespace;
- birth date: ISO date representation.

A blind index allows a record to be located without using the original plaintext as the search key. Since it is deterministic for the same input and key, it must be treated as sensitive data and protected.

## 12.6 Cryptographic keys

The main variables are `ENCRYPTION_KEY`, `BLINDED_INDEX_KEY`, and `ENCRYPTION_KEY_ID`. Both keys must be distinct and contain exactly 32 bytes after Base64 decoding.

A key must never be included in the frontend, build arguments, Docker images, repository, documentation, or unprotected backups. The rotation process must preserve access to previously encrypted data, generate new ciphertext, and update blind indexes according to the adopted key version.

## 12.7 Role and ownership authorization

Access decisions are performed by the backend. Patient endpoints validate the `User` identity and ownership of the record. Staff endpoints validate the `Staff` identity and applicable role.

CPF lookup uses an explicit allowlist of roles: `MEDICO_SOCORRISTA`, `ENFERMEIRO_SOCORRISTA`, `TECNICO_ENFERMAGEM`, and `ADMINISTRATIVO`. The tactical operator remains in the operational monitoring workflow and does not access the full clinical record through this operation.

## 12.8 Lookup auditing and legal acts

`PatientLookupAudit` records the professional identifier, role, protected identifier for the queried CPF, outcome, and timestamp. Lookup outcomes include `FOUND`, `NOT_FOUND`, and `DENIED`.

`LegalActRecord` records actions associated with legal documents, including type, version, content hash, purpose, legal basis, actor, holder, origin, and timestamp. Lookup auditing and legal-act recording have different purposes and are stored in separate models.

## 12.9 Minimization and operational events

Socket.IO events should contain only data required for occurrence monitoring. The full clinical snapshot is retrieved through a protected REST endpoint. Operational logs should favor correlation IDs and states while avoiding tokens, passwords, full CPF, phone numbers, addresses, or clinical content.

The Service Worker cache excludes API and authentication paths. The patient IndexedDB cache uses per-user scoping and time-based validity. Local retention policy should align with session rules, user switching, and account closure.

## 12.10 LGPD and governance

Health information is sensitive personal data under Brazil's LGPD. Processing requires a defined purpose, legal basis, necessity, minimization, retention, data-subject rights, sharing, processors, access control, and incident-response process.

Legal-act records help associate onboarding with a document version, but do not replace the controller's legal determination of the bases applicable to each purpose. Showing a notice in the UI does not mean every operation is necessarily based on consent.

Technical documentation does not constitute LGPD or HIPAA compliance certification. Governance must be established by the legal and institutional owners of the processing.

## 12.11 Protecting files and environments

Real `.env`, `.env.local`, and `.env.public` files, Tunnel tokens, private keys, local certificates, and database dumps must not be published. The repository should retain only examples with placeholders. GitHub publication review should include history, branches, tags, continuous-integration artifacts, and distributed backups.

Credentials must be unique per environment. Access to secrets, logs, databases, and backups must be restricted to the people and services that require it.
