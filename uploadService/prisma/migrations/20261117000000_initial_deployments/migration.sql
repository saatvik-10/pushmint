-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('queued', 'building', 'deployed', 'failed');

-- CreateEnum
CREATE TYPE "StaticFramework" AS ENUM ('vite', 'next_static');

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "framework" "StaticFramework" NOT NULL DEFAULT 'vite',
    "buildScript" TEXT NOT NULL DEFAULT 'build',
    "outputDirectory" TEXT NOT NULL DEFAULT 'dist',
    "status" "DeploymentStatus" NOT NULL DEFAULT 'queued',
    "siteUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentLog" (
    "id" SERIAL NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeploymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- CreateIndex
CREATE INDEX "Deployment_status_createdAt_idx" ON "Deployment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeploymentLog_deploymentId_id_idx" ON "DeploymentLog"("deploymentId", "id");

-- AddForeignKey
ALTER TABLE "DeploymentLog" ADD CONSTRAINT "DeploymentLog_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
