-- Vitare 2026 — módulo de emergência: idempotência persistente,
-- atribuição/ciclo de vida e outbox do servidor.
-- Não remove nem sobrescreve nenhum dado existente.

-- Novo estado operacional do incidente.
ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';

-- Campos de ciclo de vida/atribuição da emergência (todos anuláveis).
ALTER TABLE "emergency_events"
    ADD COLUMN IF NOT EXISTS "assigned_staff_id" UUID,
    ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);

-- Índice composto para paginação por cursor (keyset) do feed operacional:
-- triggerdAt DESC com desempate determinístico por id DESC.
CREATE INDEX IF NOT EXISTS "emergency_events_triggered_at_id_idx"
    ON "emergency_events" ("triggered_at" DESC, "id" DESC);

-- Vínculo opcional com o profissional que assumiu o incidente.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emergency_events_assigned_staff_id_fkey'
    ) THEN
        ALTER TABLE "emergency_events"
            ADD CONSTRAINT "emergency_events_assigned_staff_id_fkey"
            FOREIGN KEY ("assigned_staff_id") REFERENCES "staff"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Registros persistentes de idempotência (por usuário + escopo + chave).
CREATE TABLE IF NOT EXISTS "idempotency_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    "response_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_records_user_id_scope_key_key"
    ON "idempotency_records" ("user_id", "scope", "key");

CREATE INDEX IF NOT EXISTS "idempotency_records_expires_at_idx"
    ON "idempotency_records" ("expires_at");

-- Fila Outbox persistente para publicação de eventos operacionais.
CREATE TABLE IF NOT EXISTS "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outbox_events_status_created_at_idx"
    ON "outbox_events" ("status", "created_at");
