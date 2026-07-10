import type { Installation, InstallationQuery, InstallationStore } from '@slack/bolt';
import { z } from 'zod';

import { resolveInstallKey } from '../util/slack.ts';
import { prisma } from './client.ts';

// Trust-boundary check for the installation JSON read back from Postgres.
const StoredInstallationSchema = z.custom<Installation>((value) => value != null && typeof value === 'object');

/** Resolve the stable install key from an installation payload, throwing when absent. */
function resolveInstallId(installation: Installation): string {
  const installId = resolveInstallKey({
    teamId: installation.team?.id,
    enterpriseId: installation.enterprise?.id,
    isEnterpriseInstall: installation.isEnterpriseInstall,
  });
  if (installId == null) throw new Error('Could not determine a Slack install ID (missing team and enterprise IDs).');
  return installId;
}

/** Resolve the stable install key from a lookup query (mirrors resolveInstallId). */
function resolveQueryInstallId(query: InstallationQuery<boolean>): string | null {
  return resolveInstallKey(query);
}

/**
 * Prisma-backed Bolt installation store. Upserts the Organization + installer
 * User alongside each installation.
 */
export function createDbInstallationStore(): InstallationStore {
  async function storeInstallation(installation: Installation): Promise<void> {
    const installId = resolveInstallId(installation);
    const isEnterpriseInstall = installation.isEnterpriseInstall === true;
    const teamId = installation.team?.id ?? null;
    const enterpriseId = installation.enterprise?.id ?? null;
    const name = installation.team?.name ?? installation.enterprise?.name ?? null;

    const organization = await prisma.organization.upsert({
      where: { slackInstallId: installId },
      create: {
        slackInstallId: installId,
        slackTeamId: teamId,
        slackEnterpriseId: enterpriseId,
        isEnterpriseInstall,
        name,
      },
      update: {
        slackTeamId: teamId,
        slackEnterpriseId: enterpriseId,
        isEnterpriseInstall,
        name,
      },
    });

    const installationJson = JSON.parse(JSON.stringify(installation));
    await prisma.slackInstallation.upsert({
      where: { slackInstallId: installId },
      create: {
        organizationId: organization.id,
        slackInstallId: installId,
        slackTeamId: teamId,
        slackEnterpriseId: enterpriseId,
        isEnterpriseInstall,
        installerSlackUserId: installation.user.id,
        installation: installationJson,
      },
      update: {
        installerSlackUserId: installation.user.id,
        installation: installationJson,
      },
    });

    await prisma.user.upsert({
      where: {
        organizationId_slackUserId: {
          organizationId: organization.id,
          slackUserId: installation.user.id,
        },
      },
      create: {
        organizationId: organization.id,
        slackUserId: installation.user.id,
      },
      update: {},
    });
  }

  async function fetchInstallation(query: InstallationQuery<boolean>): Promise<Installation> {
    const installId = resolveQueryInstallId(query);
    const row =
      installId == null
        ? null
        : await prisma.slackInstallation.findUnique({
            where: { slackInstallId: installId },
          });
    const parsed = StoredInstallationSchema.safeParse(row?.installation);
    if (parsed.success) return parsed.data;
    throw new Error(`No installation found for install ID ${installId}`);
  }

  async function deleteInstallation(query: InstallationQuery<boolean>): Promise<void> {
    const installId = resolveQueryInstallId(query);
    if (installId == null) return;
    await prisma.slackInstallation.deleteMany({
      where: { slackInstallId: installId },
    });
  }

  return { storeInstallation, fetchInstallation, deleteInstallation };
}
