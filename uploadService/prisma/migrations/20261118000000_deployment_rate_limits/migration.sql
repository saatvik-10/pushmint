CREATE TABLE "DeploymentRateLimit" (
    "clientHash" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeploymentRateLimit_pkey" PRIMARY KEY ("clientHash", "period", "windowStart")
);

CREATE INDEX "DeploymentRateLimit_expiresAt_idx" ON "DeploymentRateLimit"("expiresAt");
