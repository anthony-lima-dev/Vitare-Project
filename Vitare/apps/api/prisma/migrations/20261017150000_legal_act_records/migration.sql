-- Create table legal_act_records (T-10: Modelo de Termos, Aviso de Privacidade e auditoria)
-- Registro versionado e append-only de aceite/ciência/consentimento.
CREATE TYPE "legal_act_type" AS ENUM ('TERMS_OF_USE', 'PRIVACY_NOTICE', 'EXPLICIT_CONSENT');

CREATE TYPE "legal_basis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTEREST', 'PUBLIC_TASK', 'LEGITIMATE_INTEREST', 'EXERCISE_OF_RIGHTS');

CREATE TABLE "legal_act_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(40) NOT NULL,
    "holder_id" UUID NOT NULL,
    "act_type" "legal_act_type" NOT NULL,
    "document_version" VARCHAR(50) NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "purpose" VARCHAR(200) NOT NULL,
    "legal_basis" "legal_basis" NOT NULL,
    "origin" VARCHAR(100) NOT NULL,
    "ip_hash" VARCHAR(64),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_act_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_act_records_holder_id_act_type_recorded_at_idx" ON "legal_act_records"("holder_id", "act_type", "recorded_at");
CREATE INDEX "legal_act_records_actor_id_recorded_at_idx" ON "legal_act_records"("actor_id", "recorded_at");
CREATE INDEX "legal_act_records_content_hash_idx" ON "legal_act_records"("content_hash");