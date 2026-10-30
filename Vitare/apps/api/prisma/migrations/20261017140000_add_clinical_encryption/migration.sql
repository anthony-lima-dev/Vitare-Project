-- Migration: 20261017140000_add_clinical_encryption
-- T-09: Criptografia de dados clínicos e snapshots.
--
-- Adiciona colunas de texto cifrado (AES-256-GCM) para os campos clínicos
-- identificáveis de condições crônicas, alergias, contatos de emergência,
-- medicamentos, histórico de medicações, medicamentos proibidos e eventos
-- de emergência (incluindo o patientSnapshot JSON).
--
-- TODAS as novas colunas sao NULLABLE: transicao de dual-escrita. As colunas
-- de plaintext sao mantidas para nao destruir dados existentes.
-- Migracao forward-only e idempotente (colunas apenas adicionadas).

-- ===== ChronicCondition =====
ALTER TABLE "chronic_conditions" ADD COLUMN "notes_enc" TEXT;

-- ===== Allergy =====
ALTER TABLE "allergies" ADD COLUMN "name_enc" TEXT;
ALTER TABLE "allergies" ADD COLUMN "severity_enc" TEXT;
ALTER TABLE "allergies" ADD COLUMN "notes_enc" TEXT;

-- ===== EmergencyContact =====
ALTER TABLE "emergency_contacts" ADD COLUMN "name_enc" TEXT;
ALTER TABLE "emergency_contacts" ADD COLUMN "phone_enc" TEXT;
ALTER TABLE "emergency_contacts" ADD COLUMN "relationship_enc" TEXT;

-- ===== Medication =====
ALTER TABLE "medications" ADD COLUMN "name_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN "dosage_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN "frequency_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN "start_date_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN "end_date_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN "notes_enc" TEXT;

-- ===== MedicationHistory =====
ALTER TABLE "medication_history" ADD COLUMN "old_value_enc" TEXT;
ALTER TABLE "medication_history" ADD COLUMN "new_value_enc" TEXT;

-- ===== ForbiddenMedication =====
ALTER TABLE "forbidden_medications" ADD COLUMN "reason_enc" TEXT;

-- ===== EmergencyEvent =====
ALTER TABLE "emergency_events" ADD COLUMN "notes_enc" TEXT;
ALTER TABLE "emergency_events" ADD COLUMN "patient_snapshot_enc" TEXT;
