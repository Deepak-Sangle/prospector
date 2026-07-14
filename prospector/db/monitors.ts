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

/** Create a monitor owned by the context's organization (resolved via install key). */
export async function createMonitor({
  context,
  input,
}: {
  context: SlackOrgContext;
  input: MonitorInput;
}): Promise<MonitorRecord> {
  return prisma.monitor.create({
    data: { ...input, organization: { connect: { slackInstallId: context.slackInstallId } } },
  });
}

/** List all monitors belonging to the organization, newest first. */
export async function listMonitors({ slackInstallId }: { slackInstallId: string }): Promise<MonitorRecord[]> {
  return prisma.monitor.findMany({
    where: { organization: { slackInstallId } },
    orderBy: { createdAt: 'desc' },
  });
}

/** List every active monitor across all organizations (used to seed the scheduler on boot). */
export async function listActiveMonitors(): Promise<MonitorRecord[]> {
  return prisma.monitor.findMany({ where: { isActive: true } });
}

/** Fields that can be changed on an existing monitor. All optional (partial update). */
export interface MonitorUpdate {
  name?: string;
  keywords?: string[];
  platforms?: MonitorInput['platforms'];
  frequency?: MonitorInput['frequency'];
  channelId?: string;
  instructions?: string | null;
  isActive?: boolean;
}

/**
 * Update a monitor by ID, scoped to the organization so one workspace can
 * never edit another's monitor. Only the provided fields are changed. Returns
 * the updated record, or null when no matching monitor exists.
 */
export async function updateMonitor({
  slackInstallId,
  monitorId,
  data,
}: {
  slackInstallId: string;
  monitorId: string;
  data: MonitorUpdate;
}): Promise<MonitorRecord | null> {
  const { count } = await prisma.monitor.updateMany({
    where: { id: monitorId, organization: { slackInstallId } },
    data,
  });
  if (count === 0) return null;
  return prisma.monitor.findFirst({ where: { id: monitorId, organization: { slackInstallId } } });
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
