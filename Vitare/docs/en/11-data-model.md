# 11. Data model and persistence

[🇧🇷 Português (Brasil)](../pt/11-modelo-dados.md) | [🇺🇸 English](11-data-model.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 11.1 Overview

Vitare's relational database uses PostgreSQL and is declared in `apps/api/prisma/schema.prisma`. The file contains 18 persisted models and four enums. Versioned migrations under `apps/api/prisma/migrations/` define the structure's evolution across releases.

Models are mapped to PostgreSQL tables through `@@map`, while attributes may be mapped to columns through `@map`. The application uses UUID identifiers, unique constraints, indexes, and relations declared with `@relation`.

## 11.2 Persisted models

| Prisma model | Physical table | Purpose |
|---|---|---|
| `User` | `users` | Patient identity, profile, and personal data. |
| `ChronicCondition` | `chronic_conditions` | Patient-associated chronic conditions. |
| `Medication` | `medications` | Medications used by the patient. |
| `MedicationHistory` | `medication_history` | Medication change history. |
| `EmergencyContact` | `emergency_contacts` | Emergency contacts. |
| `EmergencyEvent` | `emergency_events` | Occurrences and handling lifecycle. |
| `IdempotencyRecord` | `idempotency_records` | Keys and results for idempotent operations. |
| `OutboxEvent` | `outbox_events` | Events to publish after the business transaction. |
| `RefreshToken` | `refresh_tokens` | Refresh-token hashes and expiry. |
| `PasswordResetToken` | `password_reset_tokens` | Password-reset token hashes and expiry. |
| `DiseaseDictionary` | `disease_dictionary` | Disease catalogue. |
| `DiseaseGroup` | `disease_groups` | Grouping by code ranges. |
| `MedicationsDictionary` | `medications_dictionary` | Medication catalogue. |
| `Allergy` | `allergies` | Patient-recorded allergies. |
| `ForbiddenMedication` | `forbidden_medications` | Restrictions referencing catalogue medications. |
| `Staff` | `staff` | Staff identity and role. |
| `PatientLookupAudit` | `patient_lookup_audits` | CPF-based lookup audit. |
| `LegalActRecord` | `legal_act_records` | Versioned legal acts. |

## 11.3 Enumerations

The schema declares:

- `EmergencyStatus`: `TRIGGERED`, `NOTIFIED`, `ACCEPTED`, `RESOLVED`;
- `StaffRole`: `MEDICO_SOCORRISTA`, `ENFERMEIRO_SOCORRISTA`, `TECNICO_ENFERMAGEM`, `OPERADOR_TACTICAL`, `ADMINISTRATIVO`;
- `LegalActType`: `TERMS_OF_USE`, `PRIVACY_NOTICE`, `EXPLICIT_CONSENT`;
- `LegalBasis`: `CONSENT`, `CONTRACT`, `LEGAL_OBLIGATION`, `VITAL_INTEREST`, `PUBLIC_TASK`, `LEGITIMATE_INTEREST`, `EXERCISE_OF_RIGHTS`.

`LegalActRecord.actType` and `LegalActRecord.legalBasis` remain typed as `String` in the current model. The corresponding enums are also declared in the schema, but those two attributes must be interpreted according to their effective field declarations.

## 11.4 Identifiers and physical types

Models use Prisma `String` identifiers annotated with `@db.Uuid`, persisted as UUID in PostgreSQL. Temporal fields use `DateTime` or `Date` as required. Measurement and coordinate values use `Decimal` with defined precision. Snapshot and payload structures use `Json` mapped to `JsonB`.

The medication catalogue uses string arrays for substances, presentations, and warning labels. Limited-length text fields use `VarChar`; longer content uses `Text`.

## 11.5 Persisted relationships

The main declared relationships are:

- `User` to `ChronicCondition`: a patient may have multiple conditions; each condition belongs to one patient.
- `DiseaseDictionary` to `ChronicCondition`: a catalogue item may be referenced by many conditions.
- `User` to `Medication`: a patient may record multiple medications.
- `MedicationsDictionary` to `Medication`: a catalogue item may be associated with multiple patient medication records; the medication reference is optional.
- `Medication` to `MedicationHistory`: one medication may have multiple historical changes.
- `User` to `MedicationHistory`: history also identifies the holder.
- `User` to `EmergencyContact`, `Allergy`, and `ForbiddenMedication`: individual records belong to a patient.
- `MedicationsDictionary` to `ForbiddenMedication`: each restriction identifies a catalogue item.
- `User` to `EmergencyEvent`: one patient may trigger multiple occurrences.
- `Staff` to `EmergencyEvent`: one professional may accept multiple occurrences; assignment is optional before acceptance.
- `User` to `RefreshToken` and `PasswordResetToken`: an account may have multiple session and recovery records.

## 11.6 Referential integrity and deletion

Relation fields indicate whether a link is required or optional. The optional `Medication` relation to `MedicationsDictionary` uses `onDelete: SetNull`, preserving the patient's medication record when a catalogue reference is removed. `EmergencyEvent` staff assignment is also optional and uses `SetNull`.

Relations between clinical records and the user use `Cascade` actions according to the schema, so deleting a parent propagates to the defined dependent records. These actions should be considered together with data retention and governance procedures.

## 11.7 Application-maintained references

Some identifiers represent references without a declared Prisma/FK relation:

- `IdempotencyRecord.userId`;
- occurrence reference inside the `OutboxEvent.payload` JSONB;
- `PatientLookupAudit.staffId`;
- `LegalActRecord.actorId` and `holderId`;
- `DiseaseGroup` relation to `DiseaseDictionary` codes.

Consistency of these references is coordinated by application logic. They do not automatically create a PostgreSQL referential constraint.

## 11.8 Constraints and indexes

Unique constraints include:

- `User.googleId`;
- blind email and CPF indexes for `User` and `Staff`;
- `DiseaseDictionary.code`;
- `DiseaseGroup.start_code` and `end_code`;
- `(userId, scope, key)` in `IdempotencyRecord`;
- `(userId, medicationsDictionaryId)` in `ForbiddenMedication`.

Additional indexes support queries by user, active state, chronological history, recent occurrences, outbox state, tokens, and auditing. Indexes and constraints are declared in the schema and materialized through migrations.

## 11.9 Protected data persistence

`User` and `Staff` store identifying attributes in encrypted fields, such as email, CPF, phone, or full name, and maintain blind indexes for equality lookup. Other clinical models contain specific protection fields, including `*_enc` attributes.

`EmergencyEvent` stores the clinical snapshot as JSONB and has a `patientSnapshotEnc` field for the encrypted representation. Persistence of structured and encrypted content is coordinated by the emergency repository and encryption service.

## 11.10 Migrations and client generation

Migrations are located under `apps/api/prisma/migrations/`. They include catalogue creation, clinical profile expansion, medication restrictions, staff entity, schedule removal, emergency/idempotency/outbox, CPF lookup auditing, PII and clinical-data encryption, legal acts, and medication-catalogue linking.

The generator uses `prisma-client` with output `../generated/prisma`. Prisma CLI configuration is in `apps/api/prisma.config.ts`, which defines the schema, migration directory, and database URL used by the CLI. Runtime uses the PostgreSQL adapter in the infrastructure service.

Validation commands:

```bash
pnpm --filter @vitare/api exec prisma validate
pnpm --filter @vitare/api exec prisma generate
pnpm --filter @vitare/api exec prisma migrate status
```

Applying migrations in the public environment is performed by the `migrate` service, which runs `prisma migrate deploy` before the API starts.
