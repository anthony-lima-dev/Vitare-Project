/*
  Warnings:

  - The primary key for the `medications_dictionary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `medications_dictionary` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "medications_dictionary" DROP CONSTRAINT "medications_dictionary_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "medications_dictionary_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "forbidden_medications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "medications_dictionary_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forbidden_medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forbidden_medications_user_id_idx" ON "forbidden_medications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "forbidden_medications_user_id_medications_dictionary_id_key" ON "forbidden_medications"("user_id", "medications_dictionary_id");

-- AddForeignKey
ALTER TABLE "forbidden_medications" ADD CONSTRAINT "forbidden_medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forbidden_medications" ADD CONSTRAINT "forbidden_medications_medications_dictionary_id_fkey" FOREIGN KEY ("medications_dictionary_id") REFERENCES "medications_dictionary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
