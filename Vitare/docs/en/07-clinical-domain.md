# 7. Clinical domain and catalogues

[🇧🇷 Português (Brasil)](../pt/07-dominio-clinico.md) | [🇺🇸 English](07-clinical-domain.md) | [Index](00-index.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 7.1 Health-record organization

The clinical domain separates patient-specific records from reference catalogues. `User` represents the account and profile; conditions, medications, allergies, restrictions, and contacts are records associated with the user. Catalogues describe reusable concepts that can be selected when entering clinical information.

## 7.2 Chronic conditions

`ChronicCondition` associates a patient with an item from `DiseaseDictionary`. The record contains an identifier, user reference, catalogue identifier, notes, diagnosis date, active flag, and creation timestamp.

The relation to the user uses a mandatory FK. The relation to the disease catalogue is also mandatory. A patient can maintain multiple conditions, and a catalogue item can be referenced by multiple individual records.

## 7.3 Disease catalogue

`DiseaseDictionary` stores an identifier, disease code, and description. The code is unique. Records are imported from JSON files under `apps/api/prisma/data/`, including the `CID.json` source.

`DiseaseGroup` stores code-range groups with a start code, end code, and group name. Grouping uses range values and does not depend on an individual FK relation to each disease.

## 7.4 Medications

`Medication` represents a medication associated with a patient. Main attributes are name, dosage, frequency, start date, optional end date, notes, and active flag.

The relation to `MedicationsDictionary` is optional for an active medication. This allows a patient-reported medication to be recorded even when it has not been identified in the catalogue. Frequency is stored in `frequency`; the current version does not use a separate schedules entity.

The usage period is represented by `startDate` and optional `endDate`. The `isActive` flag distinguishes currently used medications from historical records.

## 7.5 Change history

`MedicationHistory` is related to both the medication and the user. Each record stores the change timestamp, changed field, and previous/new values. History makes it possible to track changes in dosage, frequency, usage period, or other relevant medication attributes.

## 7.6 Medication catalogue

`MedicationsDictionary` organizes reference items by name, laboratory, substances, presentations, and warning labels. List attributes are represented as PostgreSQL string arrays.

Source data is stored in `apps/api/prisma/data/medicamentos.json`. The seed imports records in batches so the API can provide search through `/api/v1/medications-dictionary`.

## 7.7 Allergies

`Allergy` is linked to `User` and records a name or substance, severity, notes, and creation timestamp. A patient may maintain multiple allergies. Supplied information should be clearly displayed to staff when retrieved within an authorized context.

## 7.8 Forbidden or restricted medications

`ForbiddenMedication` mandatorily associates a patient with an item from `MedicationsDictionary`. The `reason` field stores the supplied rationale. A compound constraint on user and catalogue item prevents the same restriction from being duplicated for one patient.

This entity stores a restriction declared in the patient's profile; by itself, it is not pharmacological validation or a prescription mechanism.

## 7.9 Emergency contacts

`EmergencyContact` stores name, phone, relationship to the patient, primary-contact flag, and creation timestamp. A user may maintain multiple contacts and identify one as primary.

Registered contacts provide information for lookup during the emergency workflow. Storing a contact does not mean the system automatically places a phone call or sends an SMS.

## 7.10 Relationship between individual records and catalogues

| Individual record | Related catalogue | Relationship requirement |
|---|---|---|
| `ChronicCondition` | `DiseaseDictionary` | Required. |
| `Medication` | `MedicationsDictionary` | Optional. |
| `ForbiddenMedication` | `MedicationsDictionary` | Required. |

A catalogue item is stored once and may be referenced by different patients. Individual records retain patient-specific information such as dates, notes, dosage, frequency, severity, and reason.

## 7.11 Importing and updating reference data

The `apps/api/prisma/seed.ts` script loads JSON files into the corresponding models. The process uses batch operations and `skipDuplicates` to avoid duplicating records with existing keys.

Catalogue updates should account for the original source, dataset version, encoding, code/name normalization, and compatibility with already stored data. Source files must be treated as reference data, retaining provenance and update period.
