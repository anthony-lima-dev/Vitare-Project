-- Migration: 20261017120000_add_pii_encryption
-- Criptografia de identificadores pessoais (T-08).
--
-- Adiciona colunas de texto cifrado (AES-256-GCM) e índices cegos (HMAC-SHA256
-- com chave separada) para os identificadores de User e Staff que exigem
-- busca/igualdade/unicidade (e-mail e CPF). Os demais identificadores
-- (telefone, endereco, nome, data nascimento, registro profissional) recebem
-- apenas a coluna de texto cifrado.
--
-- TODAS as novas colunas sao NULLABLE: trata-se de uma transicao de
-- dual-escrita. As colunas de plaintext sao mantidas nesta migracao e
-- removidas apenas na migracao B, apos compatibilidade verificada.
-- Migracao forward-only e idempotente (colunas apenas adicionadas).

-- ===== Users =====
ALTER TABLE "users" ADD COLUMN "email_enc" VARCHAR(512);
ALTER TABLE "users" ADD COLUMN "email_blinded_index" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "cpf_enc" VARCHAR(512);
ALTER TABLE "users" ADD COLUMN "cpf_blinded_index" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "phone_enc" VARCHAR(512);
ALTER TABLE "users" ADD COLUMN "address_enc" TEXT;
ALTER TABLE "users" ADD COLUMN "birth_date_enc" TEXT;
ALTER TABLE "users" ADD COLUMN "full_name_enc" VARCHAR(512);

CREATE UNIQUE INDEX "users_email_blinded_index_key"
  ON "users"("email_blinded_index");

CREATE UNIQUE INDEX "users_cpf_blinded_index_key"
  ON "users"("cpf_blinded_index");

-- ===== Staff =====
ALTER TABLE "staff" ADD COLUMN "email_enc" VARCHAR(512);
ALTER TABLE "staff" ADD COLUMN "email_blinded_index" VARCHAR(64);
ALTER TABLE "staff" ADD COLUMN "cpf_enc" VARCHAR(512);
ALTER TABLE "staff" ADD COLUMN "cpf_blinded_index" VARCHAR(64);
ALTER TABLE "staff" ADD COLUMN "registration_number_enc" TEXT;
ALTER TABLE "staff" ADD COLUMN "full_name_enc" VARCHAR(512);

CREATE UNIQUE INDEX "staff_email_blinded_index_key"
  ON "staff"("email_blinded_index");

CREATE UNIQUE INDEX "staff_cpf_blinded_index_key"
  ON "staff"("cpf_blinded_index");
