import type { MonitorRecord, MonitorResult } from '../schemas/db.ts';
import type { Platform } from '../schemas/monitor.ts';
import { prisma } from './client.ts';

/** A result plus its newest drafted reply (null when none drafted yet). */
export interface MonitorResultWithReply extends MonitorResult {
  latestReply: string | null;
}

/** Everything the cron worker needs to run one monitor. */
export interface MonitorRunContext {
  monitor: MonitorRecord;
  slackInstallId: string;
}

/**
 * Load a monitor plus its organization's Slack install key, or null if the
 * monitor doesn't exist. The install key is needed to resolve the bot token
 * when posting leads from the cron worker.
 */
export async function getMonitorRunContext(monitorId: string): Promise<MonitorRunContext | null> {
  const row = await prisma.monitor.findUnique({ where: { id: monitorId }, include: { organization: true } });
  if (!row) return null;
  const { organization, ...monitor } = row;
  return { monitor, slackInstallId: organization.slackInstallId };
}

/**
 * Insert a result if its URL is new for the monitor. Returns the created row,
 * or null when the (monitorId, url) pair already exists (deduped by the DB).
 */
export async function createResultIfNew(input: {
  monitorId: string;
  platform: Platform;
  author: string;
  url: string;
  content: string;
  matchedKeywords: string[];
  externalId: string | null;
}): Promise<MonitorResult | null> {
  const existing = await prisma.monitorResult.findUnique({
    where: { monitorId_url: { monitorId: input.monitorId, url: input.url } },
  });
  if (existing) return null;
  return prisma.monitorResult.create({ data: input });
}

/** Save a drafted reply for a result. Newest row wins when displaying. */
export function createReply({
  monitorResultId,
  content,
}: {
  monitorResultId: string;
  content: string;
}): Promise<{ id: string }> {
  return prisma.monitorReply.create({ data: { monitorResultId, content }, select: { id: true } });
}

/** Record the Slack message ts of the lead card posted for a result. */
export function setResultSlackTs({ resultId, slackMessageTs }: { resultId: string; slackMessageTs: string }) {
  return prisma.monitorResult.update({ where: { id: resultId }, data: { slackMessageTs } });
}

/** Stamp a monitor as having just run. */
export function markMonitorRun(monitorId: string) {
  return prisma.monitor.update({ where: { id: monitorId }, data: { lastRunAt: new Date() } });
}

/**
 * Fetch the most recent results for a monitor, newest first, each with its
 * latest drafted reply. Used by the agent's "latest results" tool.
 */
export async function getLatestResults({
  monitorId,
  limit = 10,
}: {
  monitorId: string;
  limit?: number;
}): Promise<MonitorResultWithReply[]> {
  const rows = await prisma.monitorResult.findMany({
    where: { monitorId },
    orderBy: { foundAt: 'desc' },
    take: limit,
    include: { replies: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  return rows.map(({ replies, ...result }) => ({ ...result, latestReply: replies.at(0)?.content ?? null }));
}
