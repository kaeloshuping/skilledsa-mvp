-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'contractor', 'admin');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('created', 'held', 'released', 'refunded');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'open', 'quoted', 'accepted', 'milestone1_pending', 'milestone1_verified', 'milestone2_pending', 'completed', 'disputed', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'customer',
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "notification_preference" JSONB,
    "popia_consent" BOOLEAN NOT NULL DEFAULT false,
    "data_retention_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_transfer_id" TEXT,
    "idempotency_key" TEXT,
    "amount_total" DECIMAL(10,2),
    "amount_contractor" DECIMAL(10,2),
    "amount_platform" DECIMAL(10,2),
    "status" "EscrowStatus" NOT NULL DEFAULT 'created',
    "admin_clawback_rever" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "contractor_id" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "location" TEXT,
    "travel_fee" DECIMAL(10,2),
    "total_value" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_verification_status_idx" ON "User"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_job_id_key" ON "EscrowTransaction"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_idempotency_key_key" ON "EscrowTransaction"("idempotency_key");

-- CreateIndex
CREATE INDEX "EscrowTransaction_job_id_idx" ON "EscrowTransaction"("job_id");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "AdminLog_created_at_idx" ON "AdminLog"("created_at");

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
