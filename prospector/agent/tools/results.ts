import { tool } from 'ai';
import { z } from 'zod';

import { getLatestResults, type MonitorResultWithReply } from '../../db/results.ts';
import { safe } from '../../util/result.ts';

function formatResult(result: MonitorResultWithReply): string {
  return [
    `*${result.author}* on ${result.platform} (\`${result.id}\`) — ${result.status}`,
    `> ${result.content.slice(0, 280)}`,
    `Matched: ${result.matchedKeywords.join(', ')} | <${result.url}|View post>`,
    result.latestReply ? `Draft reply: ${result.latestReply}` : 'No reply drafted yet.',
  ].join('\n');
}

/**
 * Tool: fetch the latest real results a monitor has surfaced (from the DB,
 * populated by the cron worker), each with its most recent drafted reply.
 */
export const getLatestResultsTool = tool({
  description:
    'Get the most recent leads a monitor has actually found (stored from scheduled scans), including the latest drafted reply for each. Use this to show a user what a specific monitor has surfaced.',
  inputSchema: z.object({
    monitorId: z.string().describe('The monitor ID to fetch results for. Example: "mon_1"'),
    limit: z.number().min(1).max(25).default(10).describe('How many recent results to return'),
  }),
  execute: async ({ monitorId, limit }) => {
    const fetched = await safe(() => getLatestResults({ monitorId, limit }));
    if (!fetched.success) return `Sorry, I couldn't fetch results for monitor \`${monitorId}\`: ${fetched.error}`;
    if (fetched.data.length === 0) return `No results found yet for monitor \`${monitorId}\`.`;
    return fetched.data.map(formatResult).join('\n\n');
  },
});
