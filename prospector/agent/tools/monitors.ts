import { tool } from 'ai';
import { z } from 'zod';

import { createMonitor, deleteMonitor, listMonitors, type SlackOrgContext } from '../../db/monitors.ts';
import type { MonitorRecord } from '../../schemas/db.ts';
import { FrequencySchema, PlatformSchema } from '../../schemas/monitor.ts';

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
      const monitor = await createMonitor({ context, input });
      return `Monitor created:\n${formatMonitor(monitor)}`;
    },
  });

  const list_monitors = tool({
    description:
      'List all monitors configured in this workspace, including their keywords, platforms, frequency, and target channel.',
    inputSchema: z.object({}),
    execute: async () => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const monitors = await listMonitors({ slackInstallId: context.slackInstallId });
      if (monitors.length === 0) return 'No monitors configured yet.';
      return monitors.map(formatMonitor).join('\n\n');
    },
  });

  const delete_monitor = tool({
    description: 'Delete a monitor by its ID. Confirm with the user before calling this.',
    inputSchema: z.object({
      monitorId: z.string().describe('The monitor ID to delete'),
    }),
    execute: async ({ monitorId }) => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const deleted = await deleteMonitor({ slackInstallId: context.slackInstallId, monitorId });
      return deleted ? `Monitor \`${monitorId}\` deleted.` : `No monitor found with ID \`${monitorId}\`.`;
    },
  });

  return { create_monitor, list_monitors, delete_monitor };
}
