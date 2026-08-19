/*
  Warnings:

  - You are about to alter the column `location` on the `Job` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("geography")` to `Text`.
  - Changed the type of `request_id` on the `AdminLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "AdminLog_created_at_idx";

-- DropIndex
DROP INDEX "Job_location_idx";

-- AlterTable
ALTER TABLE "AdminLog" DROP COLUMN "request_id",
ADD COLUMN     "request_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "location" SET DATA TYPE TEXT;
