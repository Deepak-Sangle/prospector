import { getConnectedAccount } from '../integrations/accounts.ts';
import { sendComment } from '../integrations/comment.ts';
import { PLATFORM_LABEL } from '../integrations/slugs.ts';
import type { Platform } from '../schemas/monitor.ts';

/** Outcome of posting a finalized reply back to the source platform. */
export type SendReplyResult =
  | { type: 'ok'; postedId: string | null }
  | { type: 'no_account'; platform: Platform }
  | { type: 'error'; error: string };

/**
 * Post a finalized reply back to the source platform using the Slack user's
 * connected account (Reddit / LinkedIn / X via Composio). Returns `no_account`
 * when the user hasn't linked that platform yet so the caller can prompt them.
 */
export async function sendReply({
  slackInstallId,
  slackUserId,
  platform,
  externalId,
  url,
  text,
}: {
  slackInstallId: string;
  slackUserId: string;
  platform: Platform;
  externalId: string | null;
  url: string;
  text: string;
}): Promise<SendReplyResult> {
  const account = await getConnectedAccount({ slackInstallId, slackUserId, platform });
  if (account == null) return { type: 'no_account', platform };
  if (account.status !== 'active') {
    return {
      type: 'error',
      error: `Your ${PLATFORM_LABEL[platform]} connection is ${account.status}; reconnect it first.`,
    };
  }

  const result = await sendComment({
    platform,
    externalId,
    url,
    text,
    composioUserId: account.composioUserId,
    composioAccountId: account.composioAccountId,
  });
  if (result.type === 'error') return result;
  return { type: 'ok', postedId: result.postedId };
}
