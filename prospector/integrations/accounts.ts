import { prisma } from '../db/client.ts';
import type { ConnectedAccount, ConnectedAccountStatus } from '../schemas/db.ts';
import type { Platform } from '../schemas/monitor.ts';
import { createLogger } from '../util/logger.ts';
import { getComposioClient } from './client.ts';

const log = createLogger('accounts');

/**
 * Build the deterministic Composio external user id for a Slack user in a
 * workspace. Composio groups connected accounts under this opaque id, so it
 * must be stable across sessions and unique per (workspace, user).
 */
export function composioUserIdFor({
  slackInstallId,
  slackUserId,
}: {
  slackInstallId: string;
  slackUserId: string;
}): string {
  return `${slackInstallId}__${slackUserId}`;
}

/** Create or update the connected account for a (org, user, platform) triple. */
export async function upsertConnectedAccount({
  slackInstallId,
  slackUserId,
  composioUserId,
  platform,
  composioAccountId,
  status,
  scopes,
  uniqueIdentifier,
}: {
  slackInstallId: string;
  slackUserId: string;
  composioUserId: string;
  platform: Platform;
  composioAccountId: string;
  status: ConnectedAccountStatus;
  scopes: string[];
  uniqueIdentifier: string | null;
}): Promise<ConnectedAccount> {
  const organization = await prisma.organization.findUnique({ where: { slackInstallId } });
  if (organization == null) throw new Error(`No organization found for install ${slackInstallId}`);

  return prisma.connectedAccount.upsert({
    where: {
      organizationId_slackUserId_platform: {
        organizationId: organization.id,
        slackUserId,
        platform,
      },
    },
    create: {
      organizationId: organization.id,
      slackUserId,
      composioUserId,
      platform,
      composioAccountId,
      status,
      scopes,
      uniqueIdentifier,
    },
    update: { composioUserId, composioAccountId, status, scopes, uniqueIdentifier },
  });
}

/** List every connected account a Slack user has in a workspace, newest first. */
export async function listConnectedAccounts({
  slackInstallId,
  slackUserId,
}: {
  slackInstallId: string;
  slackUserId: string;
}): Promise<ConnectedAccount[]> {
  return prisma.connectedAccount.findMany({
    where: { organization: { slackInstallId }, slackUserId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Fetch a single connected account for a (org, user, platform) triple, or null. */
export async function getConnectedAccount({
  slackInstallId,
  slackUserId,
  platform,
}: {
  slackInstallId: string;
  slackUserId: string;
  platform: Platform;
}): Promise<ConnectedAccount | null> {
  return prisma.connectedAccount.findFirst({
    where: { organization: { slackInstallId }, slackUserId, platform },
  });
}

/**
 * Delete a connected account for a (org, user, platform) triple. Also revokes
 * the account on Composio (best-effort) so its OAuth tokens are invalidated and
 * we don't leave orphaned connections behind. Returns whether a row was removed.
 */
export async function deleteConnectedAccount({
  slackInstallId,
  slackUserId,
  platform,
}: {
  slackInstallId: string;
  slackUserId: string;
  platform: Platform;
}): Promise<boolean> {
  // Look up the row first so we know which Composio account to revoke.
  const account = await getConnectedAccount({ slackInstallId, slackUserId, platform });
  if (account == null) return false;

  const clientResult = getComposioClient();
  if (clientResult.type === 'ok' && account.composioAccountId.length > 0) {
    try {
      await clientResult.client.connectedAccounts.delete(account.composioAccountId);
    } catch (e) {
      // Composio deletion is best-effort: the account may already be gone on
      // their side. Log and still remove our local row so the user's view is
      // consistent.
      log.error({ err: e, composioAccountId: account.composioAccountId }, 'failed to delete Composio account');
    }
  }

  const { count } = await prisma.connectedAccount.deleteMany({
    where: { organization: { slackInstallId }, slackUserId, platform },
  });
  return count > 0;
}
