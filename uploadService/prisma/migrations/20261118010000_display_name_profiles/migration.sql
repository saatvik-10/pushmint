ALTER TABLE "Deployment" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Deployment" ADD COLUMN "displayNameKey" TEXT;
CREATE INDEX "Deployment_displayNameKey_createdAt_idx" ON "Deployment"("displayNameKey", "createdAt");
