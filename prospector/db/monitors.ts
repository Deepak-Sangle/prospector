import type { MonitorRecord } from '../schemas/db.ts';
import type { MonitorInput } from '../schemas/monitor.ts';
import { prisma } from './client.ts';

/** Slack workspace/user identity of the request driving a DB operation. */
export interface SlackOrgContext {
  slackInstallId: string;
  slackTeamId: string | null;
  slackEnterpriseId: string | null;
  isEnterpriseInstall: boolean;
  slackUserId: string;
}

/**
 * Find-or-create the Organization and User rows for a request context. The
 * organization normally already exists from the OAuth install; this keeps
 * tool calls resilient if a user interacts before rows are backfilled.
 */
async function upsertOrgAndUser({
  slackInstallId,
  slackTeamId,
  slackEnterpriseId,
  isEnterpriseInstall,
  slackUserId,
}: SlackOrgContext): Promise<{ organizationId: string; userId: string }> {
  const organization = await prisma.organization.upsert({
    where: { slackInstallId },
    create: { slackInstallId, slackTeamId, slackEnterpriseId, isEnterpriseInstall },
    update: {},
  });
  const user = await prisma.user.upsert({
    where: { organizationId_slackUserId: { organizationId: organization.id, slackUserId } },
    create: { organizationId: organization.id, slackUserId },
    update: {},
  });
  return { organizationId: organization.id, userId: user.id };
}

/** Create a monitor owned by the context's organization and user. */
export async function createMonitor({
  context,
  input,
}: {
  context: SlackOrgContext;
  input: MonitorInput;
}): Promise<MonitorRecord> {
  const { organizationId, userId } = await upsertOrgAndUser(context);
  return prisma.monitor.create({ data: { ...input, organizationId, createdById: userId } });
}

/** List all monitors belonging to the organization, newest first. */
export async function listMonitors({ slackInstallId }: { slackInstallId: string }): Promise<MonitorRecord[]> {
  return prisma.monitor.findMany({
    where: { organization: { slackInstallId } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a monitor by ID, scoped to the organization so one workspace can
 * never delete another's monitor. Returns whether a row was deleted.
 */
export async function deleteMonitor({
  slackInstallId,
  monitorId,
}: {
  slackInstallId: string;
  monitorId: string;
}): Promise<boolean> {
  const { count } = await prisma.monitor.deleteMany({
    where: { id: monitorId, organization: { slackInstallId } },
  });
  return count > 0;
}
