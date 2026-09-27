/*
  Warnings:

  - You are about to drop the column `aiNotes` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "aiNotes",
ADD COLUMN     "checks" JSONB,
ADD COLUMN     "extractedBy" TEXT,
ADD COLUMN     "extractedText" TEXT;
