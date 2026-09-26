-- CreateEnum
CREATE TYPE "SubmissionSource" AS ENUM ('ONLINE', 'SCAN');

-- AlterTable
ALTER TABLE "TestSubmission" ADD COLUMN     "source" "SubmissionSource" NOT NULL DEFAULT 'ONLINE';
