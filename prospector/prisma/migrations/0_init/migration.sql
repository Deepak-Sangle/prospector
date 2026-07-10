-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('reddit', 'linkedin', 'x');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('hourly', 'every_6_hours', 'daily');

-- CreateEnum
CREATE TYPE "MonitorResultStatus" AS ENUM ('new', 'dismissed');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slackTeamId" TEXT NOT NULL,
    "slackEnterpriseId" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackInstallation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slackTeamId" TEXT NOT NULL,
    "slackEnterpriseId" TEXT,
    "installerSlackUserId" TEXT NOT NULL,
    "installation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monitor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "platforms" "Platform"[],
    "frequency" "Frequency" NOT NULL,
    "channelId" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorResult" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "author" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "matchedKeywords" TEXT[],
    "status" "MonitorResultStatus" NOT NULL DEFAULT 'new',
    "slackMessageTs" TEXT,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitorResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorReply" (
    "id" TEXT NOT NULL,
    "monitorResultId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitorReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slackTeamId_key" ON "Organization"("slackTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_slackUserId_key" ON "User"("organizationId", "slackUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackInstallation_slackTeamId_key" ON "SlackInstallation"("slackTeamId");

-- CreateIndex
CREATE INDEX "Monitor_organizationId_idx" ON "Monitor"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorResult_monitorId_url_key" ON "MonitorResult"("monitorId", "url");

-- CreateIndex
CREATE INDEX "MonitorReply_monitorResultId_idx" ON "MonitorReply"("monitorResultId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackInstallation" ADD CONSTRAINT "SlackInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorResult" ADD CONSTRAINT "MonitorResult_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorReply" ADD CONSTRAINT "MonitorReply_monitorResultId_fkey" FOREIGN KEY ("monitorResultId") REFERENCES "MonitorResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

