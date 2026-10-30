/*
  Warnings:

  - Changed the type of `act_type` on the `legal_act_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `legal_basis` on the `legal_act_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LegalActType" AS ENUM ('TERMS_OF_USE', 'PRIVACY_NOTICE', 'EXPLICIT_CONSENT');

-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTEREST', 'PUBLIC_TASK', 'LEGITIMATE_INTEREST', 'EXERCISE_OF_RIGHTS');

-- AlterTable
ALTER TABLE "idempotency_records" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "legal_act_records" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "act_type",
ADD COLUMN     "act_type" VARCHAR(30) NOT NULL,
DROP COLUMN "legal_basis",
ADD COLUMN     "legal_basis" VARCHAR(40) NOT NULL;

-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "medications_dictionary_id" UUID;

-- AlterTable
ALTER TABLE "outbox_events" ALTER COLUMN "id" DROP DEFAULT;

-- DropEnum
DROP TYPE "legal_act_type";

-- DropEnum
DROP TYPE "legal_basis";

-- CreateTable
CREATE TABLE "patient_lookup_audits" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "staff_role" VARCHAR(40) NOT NULL,
    "cpf_searched" VARCHAR(64) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_lookup_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_lookup_audits_staff_id_created_at_idx" ON "patient_lookup_audits"("staff_id", "created_at");

-- CreateIndex
CREATE INDEX "patient_lookup_audits_cpf_searched_idx" ON "patient_lookup_audits"("cpf_searched");

-- CreateIndex
CREATE INDEX "legal_act_records_holder_id_act_type_recorded_at_idx" ON "legal_act_records"("holder_id", "act_type", "recorded_at");

-- CreateIndex
CREATE INDEX "medications_user_id_medications_dictionary_id_idx" ON "medications"("user_id", "medications_dictionary_id");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_medications_dictionary_id_fkey" FOREIGN KEY ("medications_dictionary_id") REFERENCES "medications_dictionary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
