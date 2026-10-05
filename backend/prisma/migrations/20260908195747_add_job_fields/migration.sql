/*
  Warnings:

  - Added the required column `description` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trade` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "needsConsultation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photos" JSONB,
ADD COLUMN     "title" VARCHAR(255) NOT NULL,
ADD COLUMN     "trade" VARCHAR(100) NOT NULL,
ADD COLUMN     "travelFeeAccepted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Job_trade_idx" ON "Job"("trade");

-- CreateIndex
CREATE INDEX "Job_locationLat_locationLng_idx" ON "Job"("locationLat", "locationLng");
