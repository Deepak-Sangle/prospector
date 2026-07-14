import type { WebClient } from '@slack/web-api';
import { tool } from 'ai';
import { z } from 'zod';

import { safe } from '../../util/result.ts';

const MISSING_CLIENT_MESSAGE =
  'Slack API access is unavailable for this conversation, so channel listing is not possible right now.';

interface SlackChannel {
  id?: string;
  name?: string;
  is_member?: boolean;
  is_archived?: boolean;
  is_private?: boolean;
}

function formatChannel(channel: SlackChannel): string {
  const membership = channel.is_member ? 'bot is a member' : 'bot NOT in channel';
  const visibility = channel.is_private ? 'private' : 'public';
  return `*#${channel.name}* (\`${channel.id}\`) — ${visibility}, ${membership}`;
}

/**
 * Build the Slack channel-listing tool bound to the request's WebClient.
 * Lets the agent resolve real channel IDs (and confirm whether the bot has
 * joined a channel) instead of guessing/hallucinating IDs when creating a
 * monitor. `client` is null when Slack API access can't be resolved.
 */
export function createChannelTools(client: WebClient | null, teamId?: string | null) {
  const list_slack_channels = tool({
    description:
      'List the Slack channels in this workspace with their real channel IDs and whether Prospector (the bot) is a ' +
      'member of each. ALWAYS call this to resolve a channel ID before creating a monitor — never guess or invent a ' +
      'channel ID. If the target channel shows the bot is not a member, tell the user to invite the bot with ' +
      '`/invite @Prospector` so it can post leads there.',
    inputSchema: z.object({}),
    execute: async () => {
      if (client == null) return MISSING_CLIENT_MESSAGE;

      const listed = await safe(async () => {
        const found: SlackChannel[] = [];
        let cursor: string | undefined;
        // Page through all channels; Slack caps each page, so follow the cursor.
        // `team_id` is required for org-wide (Enterprise Grid) installs, where the
        // bot token isn't bound to a single workspace; it's harmless for regular
        // single-workspace installs. Comes from the request's Bolt context.
        do {
          const response = await client.conversations.list({
            types: 'public_channel,private_channel',
            exclude_archived: true,
            limit: 1000,
            cursor,
            ...(teamId ? { team_id: teamId } : {}),
          });
          for (const channel of response.channels ?? []) {
            found.push(channel as SlackChannel);
          }
          cursor = response.response_metadata?.next_cursor || undefined;
        } while (cursor);
        return found;
      });

      if (!listed.success) return `Sorry, I couldn't list the channels: ${listed.error}`;

      const channels = listed.data;
      if (channels.length === 0) return 'No channels found in this workspace.';

      // Surface channels the bot can already post to first.
      channels.sort((a, b) => Number(b.is_member ?? false) - Number(a.is_member ?? false));
      return channels.map(formatChannel).join('\n');
    },
  });

  return { list_slack_channels };
}
