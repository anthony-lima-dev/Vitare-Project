-- Migration: 20261017130000_remove_pii_plaintext
-- T-08: remove colunas de plaintext de identificadores pessoais de User
-- e Staff, APOS compatibilidade verificada.
-- Mantem apenas texto cifrado (*_enc) e indices cegos (*_blinded_index).
-- Forward-only.

-- Os indices unicos de plaintext foram criados pelo Prisma como
-- CREATE UNIQUE INDEX (sem objeto de constraint), entao removemos por indice.
DROP INDEX IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "users_cpf_key";
DROP INDEX IF EXISTS "staff_email_key";
DROP INDEX IF EXISTS "staff_cpf_key";

ALTER TABLE "users" DROP COLUMN "full_name";
ALTER TABLE "users" DROP COLUMN "email";
ALTER TABLE "users" DROP COLUMN "cpf";
ALTER TABLE "users" DROP COLUMN "phone";
ALTER TABLE "users" DROP COLUMN "address";
ALTER TABLE "users" DROP COLUMN "birth_date";

ALTER TABLE "staff" DROP COLUMN "full_name";
ALTER TABLE "staff" DROP COLUMN "email";
ALTER TABLE "staff" DROP COLUMN "cpf";
ALTER TABLE "staff" DROP COLUMN "registrationNumber";
