-- Organization: add stable install key + enterprise flag, relax slackTeamId
ALTER TABLE "Organization" ADD COLUMN "slackInstallId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "isEnterpriseInstall" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Organization" SET "slackInstallId" = COALESCE("slackInstallId", "slackTeamId", "slackEnterpriseId", "id");
ALTER TABLE "Organization" ALTER COLUMN "slackInstallId" SET NOT NULL;
ALTER TABLE "Organization" ALTER COLUMN "slackTeamId" DROP NOT NULL;
DROP INDEX IF EXISTS "Organization_slackTeamId_key";
CREATE UNIQUE INDEX "Organization_slackInstallId_key" ON "Organization"("slackInstallId");

-- SlackInstallation: same treatment
ALTER TABLE "SlackInstallation" ADD COLUMN "slackInstallId" TEXT;
ALTER TABLE "SlackInstallation" ADD COLUMN "isEnterpriseInstall" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SlackInstallation" SET "slackInstallId" = COALESCE("slackInstallId", "slackTeamId", "slackEnterpriseId", "id");
ALTER TABLE "SlackInstallation" ALTER COLUMN "slackInstallId" SET NOT NULL;
ALTER TABLE "SlackInstallation" ALTER COLUMN "slackTeamId" DROP NOT NULL;
DROP INDEX IF EXISTS "SlackInstallation_slackTeamId_key";
CREATE UNIQUE INDEX "SlackInstallation_slackInstallId_key" ON "SlackInstallation"("slackInstallId");
