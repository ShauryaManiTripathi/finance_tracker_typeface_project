/*
  Warnings:

  - You are about to drop the column `metadata` on the `upload_previews` table. All the data in the column will be lost.
  - You are about to drop the `import_previews` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "upload_previews_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "upload_previews" DROP COLUMN "metadata";

-- DropTable
DROP TABLE "import_previews";

-- CreateIndex
CREATE INDEX "upload_previews_userId_expiresAt_idx" ON "upload_previews"("userId", "expiresAt");
