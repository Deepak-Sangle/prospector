import { tool } from 'ai';
import { z } from 'zod';

import type { SlackOrgContext } from '../../db/monitors.ts';
import { deleteConnectedAccount, listConnectedAccounts } from '../../integrations/accounts.ts';
import { startConnection } from '../../integrations/connect.ts';
import { PLATFORM_LABEL } from '../../integrations/slugs.ts';
import type { ConnectedAccount } from '../../schemas/db.ts';
import { PlatformSchema } from '../../schemas/monitor.ts';
import { safe } from '../../util/result.ts';

const MISSING_WORKSPACE_MESSAGE =
  'Could not determine the Slack workspace for this conversation, so account tools are unavailable.';

function formatAccount(account: ConnectedAccount): string {
  const label = PLATFORM_LABEL[account.platform];
  const identity = account.uniqueIdentifier != null ? ` (${account.uniqueIdentifier})` : '';
  return `*${label}*${identity} — ${account.status}`;
}

/**
 * Build the account-connection tools bound to the request's Slack org context.
 * These let a user link their Reddit / LinkedIn / X account via Composio OAuth
 * so Prospector can post replies on their behalf. `context` is null when the
 * workspace can't be resolved; the tools then respond with an explanation.
 */
export function createConnectionTools(context: SlackOrgContext | null) {
  const connect_account = tool({
    description:
      "Start connecting the user's Reddit, LinkedIn, or X account so Prospector can post replies on their behalf. " +
      'Returns an authorization link the user must open to grant access. Call this when the user wants to connect an ' +
      'account or when sending a reply fails because no account is connected.',
    inputSchema: z.object({
      platform: PlatformSchema.describe('Which platform to connect: reddit, linkedin, or x'),
    }),
    execute: async ({ platform }) => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const started = await safe(() =>
        startConnection({
          slackInstallId: context.slackInstallId,
          slackUserId: context.slackUserId,
          platform,
        }),
      );
      if (!started.success) {
        return `Couldn't start the ${PLATFORM_LABEL[platform]} connection: ${started.error}`;
      }
      const result = started.data;
      if (result.type === 'not_configured') {
        return `Connecting ${PLATFORM_LABEL[platform]} isn't configured yet on this deployment. Ask an admin to set the Composio auth config for ${platform}.`;
      }
      if (result.type === 'error') {
        return `Couldn't start the ${PLATFORM_LABEL[platform]} connection: ${result.error}`;
      }
      return `To connect your ${PLATFORM_LABEL[platform]} account, open this link and authorize access:\n${result.redirectUrl}\n\nOnce you're done, you can send replies to ${PLATFORM_LABEL[platform]} posts.`;
    },
  });

  const list_connected_accounts = tool({
    description: 'List the social accounts (Reddit / LinkedIn / X) the user has connected for posting replies.',
    inputSchema: z.object({}),
    execute: async () => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const listed = await safe(() =>
        listConnectedAccounts({
          slackInstallId: context.slackInstallId,
          slackUserId: context.slackUserId,
        }),
      );
      if (!listed.success) return `Sorry, I couldn't fetch your connected accounts: ${listed.error}`;
      if (listed.data.length === 0) return 'No social accounts connected yet. Use `connect_account` to link one.';
      return listed.data.map(formatAccount).join('\n');
    },
  });

  const disconnect_account = tool({
    description: 'Disconnect a previously connected social account. Confirm with the user before calling.',
    inputSchema: z.object({
      platform: PlatformSchema.describe('Which platform to disconnect: reddit, linkedin, or x'),
    }),
    execute: async ({ platform }) => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const removed = await safe(() =>
        deleteConnectedAccount({
          slackInstallId: context.slackInstallId,
          slackUserId: context.slackUserId,
          platform,
        }),
      );
      if (!removed.success) {
        return `Sorry, I couldn't disconnect your ${PLATFORM_LABEL[platform]} account: ${removed.error}`;
      }
      return removed.data
        ? `Disconnected your ${PLATFORM_LABEL[platform]} account.`
        : `No connected ${PLATFORM_LABEL[platform]} account found.`;
    },
  });

  return { connect_account, list_connected_accounts, disconnect_account };
}
