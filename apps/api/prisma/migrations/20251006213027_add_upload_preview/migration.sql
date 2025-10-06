-- CreateTable
CREATE TABLE "upload_previews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_previews_userId_createdAt_idx" ON "upload_previews"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "upload_previews_expiresAt_idx" ON "upload_previews"("expiresAt");
