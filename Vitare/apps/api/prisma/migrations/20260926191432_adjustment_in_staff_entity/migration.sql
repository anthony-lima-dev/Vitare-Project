/*
  Warnings:

  - You are about to drop the column `created_at` on the `staff` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cpf]` on the table `staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `registrationNumber` to the `staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `staff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MEDICO_SOCORRISTA', 'ENFERMEIRO_SOCORRISTA', 'TECNICO_ENFERMAGEM', 'OPERADOR_TACTICAL', 'ADMINISTRATIVO');

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "created_at",
ADD COLUMN     "cpf" VARCHAR(14),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "registrationNumber" TEXT NOT NULL,
ADD COLUMN     "role" "StaffRole" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "staff_cpf_key" ON "staff"("cpf");
