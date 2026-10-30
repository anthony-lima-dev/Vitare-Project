/*
  Warnings:

  - You are about to drop the column `targas` on the `medications_dictionary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "medications_dictionary" DROP COLUMN "targas",
ADD COLUMN     "tarjas" TEXT[];
