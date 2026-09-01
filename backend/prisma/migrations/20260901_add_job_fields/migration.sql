-- Add new columns
ALTER TABLE "Job" ADD COLUMN "title" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "trade" VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "photos" JSONB;
ALTER TABLE "Job" ADD COLUMN "locationLat" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN "locationLng" DOUBLE PRECISION;
ALTER TABLE "Job" ADD COLUMN "needsConsultation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "travelFeeAccepted" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX "Job_trade_idx" ON "Job"("trade");
CREATE INDEX "Job_locationLat_locationLng_idx" ON "Job"("locationLat", "locationLng");