/*
  Warnings:

  - You are about to drop the column `category` on the `chronic_conditions` table. All the data in the column will be lost.
  - You are about to drop the column `cid_code` on the `chronic_conditions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `chronic_conditions` table. All the data in the column will be lost.
  - The primary key for the `disease_dictionary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `code` on the `disease_dictionary` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `name` on the `disease_dictionary` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The primary key for the `disease_groups` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `disease_groups` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `disease_groups` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `disease_groups` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - Added the required column `disease_id` to the `chronic_conditions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `disease_dictionary` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `disease_groups` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "chronic_conditions" DROP COLUMN "category",
DROP COLUMN "cid_code",
DROP COLUMN "name",
ADD COLUMN     "disease_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "disease_dictionary" DROP CONSTRAINT "disease_dictionary_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "code" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "disease_dictionary_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "disease_groups" DROP CONSTRAINT "disease_groups_pkey",
DROP COLUMN "created_at",
DROP COLUMN "updated_at",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(150),
ADD CONSTRAINT "disease_groups_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "ConditionCategory";

-- AddForeignKey
ALTER TABLE "chronic_conditions" ADD CONSTRAINT "chronic_conditions_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "disease_dictionary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
