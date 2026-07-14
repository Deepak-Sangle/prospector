/*
  Warnings:

  - You are about to drop the column `createdById` on the `Monitor` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConnectedAccountStatus" AS ENUM ('active', 'expired', 'inactive');

-- DropForeignKey
ALTER TABLE "Monitor" DROP CONSTRAINT "Monitor_createdById_fkey";

-- AlterTable
ALTER TABLE "Monitor" DROP COLUMN "createdById",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "MonitorResult" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "composioUserId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "composioAccountId" TEXT NOT NULL,
    "status" "ConnectedAccountStatus" NOT NULL DEFAULT 'active',
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uniqueIdentifier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_composioAccountId_key" ON "ConnectedAccount"("composioAccountId");

-- CreateIndex
CREATE INDEX "ConnectedAccount_organizationId_idx" ON "ConnectedAccount"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_organizationId_slackUserId_platform_key" ON "ConnectedAccount"("organizationId", "slackUserId", "platform");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
