-- Enable PostGIS extension for geography support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enums
CREATE TYPE "Role" AS ENUM ('customer', 'contractor', 'admin');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE "EscrowStatus" AS ENUM ('created', 'held', 'released', 'refunded');
CREATE TYPE "JobStatus" AS ENUM ('draft', 'open', 'quoted', 'accepted', 'milestone1_pending', 'milestone1_verified', 'milestone2_pending', 'completed', 'disputed', 'cancelled');

-- Users
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

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_verification_status_idx" ON "User"("verification_status");

-- Verification Requests
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE,
    "role" "Role" NOT NULL,
    "id_photo_url" TEXT NOT NULL,
    "selfie_url" TEXT NOT NULL,
    "certificate_url" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");
CREATE INDEX "VerificationRequest_created_at_idx" ON "VerificationRequest"("created_at");

-- Refresh Tokens
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL UNIQUE,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");
CREATE INDEX "RefreshToken_expires_at_idx" ON "RefreshToken"("expires_at");

-- File Uploads
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FileUpload_uploaded_by_idx" ON "FileUpload"("uploaded_by");
CREATE INDEX "FileUpload_expires_at_idx" ON "FileUpload"("expires_at");

-- Jobs (with geography column)
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "contractor_id" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "location" geography(Point, 4326),  -- PostGIS geography
    "travel_fee" DECIMAL(10,2),
    "total_value" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_location_idx" ON "Job" USING GIST ("location");

-- Escrow Transactions
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL UNIQUE,
    "stripe_payment_intent_id" TEXT,
    "stripe_transfer_id" TEXT,
    "idempotency_key" TEXT UNIQUE,
    "amount_total" DECIMAL(10,2),
    "amount_contractor" DECIMAL(10,2),
    "amount_platform" DECIMAL(10,2),
    "status" "EscrowStatus" NOT NULL DEFAULT 'created',
    "admin_clawback_rever" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EscrowTransaction_job_id_idx" ON "EscrowTransaction"("job_id");

-- Admin Logs (with BRIN index for time-series)
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminLog_admin_id_idx" ON "AdminLog"("admin_id");
CREATE INDEX "AdminLog_created_at_idx" ON "AdminLog" USING BRIN ("created_at");

-- Foreign Keys
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;