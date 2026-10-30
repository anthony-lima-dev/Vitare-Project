-- CreateTable
CREATE TABLE "disease_groups" (
    "id" TEXT NOT NULL,
    "start_code" TEXT NOT NULL,
    "end_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disease_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disease_groups_start_code_end_code_key" ON "disease_groups"("start_code", "end_code");
