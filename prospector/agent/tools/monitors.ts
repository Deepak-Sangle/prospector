import { tool } from 'ai';
import { z } from 'zod';

import { registerMonitor, unregisterMonitor } from '../../cron/scheduler.ts';
import { runMonitor } from '../../cron/workflow.ts';
import {
  createMonitor,
  deleteMonitor,
  listMonitors,
  type MonitorUpdate,
  type SlackOrgContext,
  updateMonitor,
} from '../../db/monitors.ts';
import type { MonitorRecord } from '../../schemas/db.ts';
import { FrequencySchema, PlatformSchema } from '../../schemas/monitor.ts';
import { createLogger } from '../../util/logger.ts';
import { safe } from '../../util/result.ts';

const log = createLogger('monitors');

const MISSING_WORKSPACE_MESSAGE =
  'Could not determine the Slack workspace for this conversation, so monitor tools are unavailable.';

function formatMonitor(monitor: MonitorRecord): string {
  return [
    `*${monitor.name}* (\`${monitor.id}\`)${monitor.isActive ? '' : ' — paused'}`,
    `Keywords: ${monitor.keywords.join(', ')}`,
    `Platforms: ${monitor.platforms.join(', ')} | Frequency: ${monitor.frequency}`,
    `Posts to: <#${monitor.channelId}>`,
    monitor.instructions ? `Instructions: ${monitor.instructions}` : null,
  ]
    .filter((line) => line != null)
    .join('\n');
}

/**
 * Build the monitor CRUD tools bound to the request's Slack org context.
 * `context` is null when the workspace could not be resolved (e.g. missing
 * team ID); the tools then respond with an explanatory message.
 */
export function createMonitorTools(context: SlackOrgContext | null) {
  const create_monitor = tool({
    description:
      'Create a new monitor that watches social platforms for keyword matches and posts qualified leads to a Slack channel. ' +
      'Ask the user for any missing required fields (name, keywords, platforms, frequency, channel) before calling.',
    inputSchema: z.object({
      name: z.string().min(1).describe('Short monitor name. Example: "AI dev tools leads"'),
      keywords: z.array(z.string().min(1)).min(1).max(10).describe('Up to 10 keywords or phrases to watch'),
      platforms: z.array(PlatformSchema).min(1).describe('Platforms to scan'),
      frequency: FrequencySchema,
      channelId: z.string().describe('Slack channel ID to post leads into'),
      instructions: z.string().nullable().describe('Optional custom filter instructions, null if none'),
    }),
    execute: async (input) => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const created = await safe(() => createMonitor({ context, input }));
      if (!created.success) {
        log.error({ error: created.error }, 'failed to create monitor');
        return `Sorry, I couldn't create that monitor: ${created.error}`;
      }
      const monitor = created.data;
      // Schedule this monitor's scan in-process, anchored to its creation time
      // so runs spread out instead of all firing at once.
      const cron = registerMonitor(monitor);
      // Kick off an initial scan now so the user sees leads without waiting a
      // full interval. Runs in the background; the URL dedupe in the workflow
      // keeps it from double-posting against the first scheduled tick.
      runMonitor(monitor.id).catch((err) => log.error({ err, monitorId: monitor.id }, 'initial run failed'));
      const schedule = cron
        ? `scans on \`${cron}\` UTC, first scan starting now`
        : 'first scan starting now (scheduling will retry on next boot)';
      return `Monitor created (${schedule}):\n${formatMonitor(monitor)}`;
    },
  });

  const list_monitors = tool({
    description:
      'List all monitors configured in this workspace, including their keywords, platforms, frequency, and target channel.',
    inputSchema: z.object({}),
    execute: async () => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const listed = await safe(() => listMonitors({ slackInstallId: context.slackInstallId }));
      if (!listed.success) {
        log.error({ error: listed.error }, 'failed to list monitors');
        return `Sorry, I couldn't fetch your monitors: ${listed.error}`;
      }
      if (listed.data.length === 0) return 'No monitors configured yet.';
      return listed.data.map(formatMonitor).join('\n\n');
    },
  });

  const edit_monitor = tool({
    description:
      'Edit an existing monitor by ID. Only pass the fields the user wants to change; leave the rest null to keep them as-is. ' +
      'Use this to rename a monitor, adjust keywords/platforms, change scan frequency, move it to a different channel, ' +
      'update filter instructions, or pause/resume it (isActive). ' +
      'When changing the channel, first call `list_slack_channels` to resolve the real channel ID — never guess it.',
    inputSchema: z.object({
      monitorId: z.string().describe('The monitor ID to edit'),
      name: z.string().min(1).nullable().describe('New monitor name, or null to keep unchanged'),
      keywords: z
        .array(z.string().min(1))
        .min(1)
        .max(10)
        .nullable()
        .describe('New full list of keywords (replaces the existing list), or null to keep unchanged'),
      platforms: z
        .array(PlatformSchema)
        .min(1)
        .nullable()
        .describe('New full list of platforms (replaces the existing list), or null to keep unchanged'),
      frequency: FrequencySchema.nullable().describe('New scan frequency, or null to keep unchanged'),
      channelId: z
        .string()
        .nullable()
        .describe(
          'New Slack channel ID to post leads into (resolve via list_slack_channels), or null to keep unchanged',
        ),
      instructions: z
        .string()
        .nullable()
        .describe('New custom filter instructions. Pass a string to set, or null to keep unchanged'),
      isActive: z
        .boolean()
        .nullable()
        .describe('Set false to pause the monitor, true to resume it, or null to keep unchanged'),
    }),
    execute: async ({ monitorId, name, keywords, platforms, frequency, channelId, instructions, isActive }) => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;

      const data: MonitorUpdate = {};
      if (name != null) data.name = name;
      if (keywords != null) data.keywords = keywords;
      if (platforms != null) data.platforms = platforms;
      if (frequency != null) data.frequency = frequency;
      if (channelId != null) data.channelId = channelId;
      if (instructions !== null) data.instructions = instructions;
      if (isActive != null) data.isActive = isActive;

      if (Object.keys(data).length === 0) {
        return 'No changes provided. Tell me which field(s) to update (name, keywords, platforms, frequency, channel, instructions, or pause/resume).';
      }

      const updated = await safe(() => updateMonitor({ slackInstallId: context.slackInstallId, monitorId, data }));
      if (!updated.success) {
        log.error({ error: updated.error, monitorId }, 'failed to update monitor');
        return `Sorry, I couldn't update that monitor: ${updated.error}`;
      }
      const monitor = updated.data;
      if (monitor == null) return `No monitor found with ID \`${monitorId}\`.`;

      // Re-sync the scheduler: an active monitor is (re-)registered with its
      // current frequency; a paused one is unregistered so it stops scanning.
      if (monitor.isActive) {
        const cron = registerMonitor(monitor);
        const schedule = cron ? ` (scans on \`${cron}\` UTC)` : '';
        return `Monitor updated${schedule}:\n${formatMonitor(monitor)}`;
      }
      unregisterMonitor(monitor.id);
      return `Monitor updated:\n${formatMonitor(monitor)}`;
    },
  });

  const delete_monitor = tool({
    description: 'Delete a monitor by its ID. Confirm with the user before calling this.',
    inputSchema: z.object({
      monitorId: z.string().describe('The monitor ID to delete'),
    }),
    execute: async ({ monitorId }) => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const removed = await safe(() => deleteMonitor({ slackInstallId: context.slackInstallId, monitorId }));
      if (!removed.success) {
        log.error({ error: removed.error, monitorId }, 'failed to delete monitor');
        return `Sorry, I couldn't delete that monitor: ${removed.error}`;
      }
      if (removed.data) unregisterMonitor(monitorId);
      return removed.data ? `Monitor \`${monitorId}\` deleted.` : `No monitor found with ID \`${monitorId}\`.`;
    },
  });

  return { create_monitor, list_monitors, edit_monitor, delete_monitor };
}
