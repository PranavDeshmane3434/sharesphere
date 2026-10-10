-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM (
  'NOTES',
  'QUESTION_PAPER',
  'ASSIGNMENT',
  'LAB_MANUAL',
  'PPT',
  'SOLVED_PAPER',
  'REFERENCE_MATERIAL'
);

-- AlterTable
ALTER TABLE "resources"
  ADD COLUMN "category" "ResourceCategory",
  ADD COLUMN "semester" INTEGER,
  ADD COLUMN "subject" TEXT,
  ADD COLUMN "unit" INTEGER,
  ADD COLUMN "academic_year" TEXT;
  