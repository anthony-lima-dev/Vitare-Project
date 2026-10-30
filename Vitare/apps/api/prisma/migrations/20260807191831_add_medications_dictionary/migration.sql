-- AlterTable
ALTER TABLE "disease_dictionary" ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "disease_groups" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "medications_dictionary" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "laboratorio" VARCHAR(255) NOT NULL,
    "substancias" TEXT[],
    "apresentacoes" TEXT[],
    "targas" TEXT[],

    CONSTRAINT "medications_dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medications_dictionary_nome_idx" ON "medications_dictionary"("nome");
