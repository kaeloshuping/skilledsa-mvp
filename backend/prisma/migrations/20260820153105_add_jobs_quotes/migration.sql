-- ============================================
-- Migration: add_jobs_quotes
-- Purpose: Add Job and Quote models with PostGIS
-- ============================================

-- 1. Enable PostGIS extension (if not already)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop existing foreign key constraints that depend on Job
ALTER TABLE "EscrowTransaction" DROP CONSTRAINT IF EXISTS "EscrowTransaction_job_id_fkey";

-- 3. Drop the old Job table (and any other objects)
DROP TABLE IF EXISTS "Job" CASCADE;

-- 4. Create the new Job table with geography column
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "photos" TEXT[] NOT NULL,
    "location" geography(Point, 4326),
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "needsConsultation" BOOLEAN NOT NULL DEFAULT false,
    "travelFeeAccepted" BOOLEAN NOT NULL DEFAULT true,
    "status" "JobStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- 5. Recreate foreign key to EscrowTransaction
ALTER TABLE "EscrowTransaction" 
    ADD CONSTRAINT "EscrowTransaction_job_id_fkey" 
    FOREIGN KEY ("job_id") REFERENCES "Job"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Create indexes for Job
CREATE INDEX "Job_customerId_idx" ON "Job"("customerId");
CREATE INDEX "Job_trade_idx" ON "Job"("trade");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "idx_job_location" ON "Job" USING GIST ("location");

-- 7. Create Quote table
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "timeline" INTEGER NOT NULL,
    "travelFee" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Quote_jobId_idx" ON "Quote"("jobId");
CREATE INDEX "Quote_contractorId_idx" ON "Quote"("contractorId");

ALTER TABLE "Quote" 
    ADD CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quote" 
    ADD CONSTRAINT "Quote_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Add foreign key from Job to User (customer)
ALTER TABLE "Job" 
    ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;