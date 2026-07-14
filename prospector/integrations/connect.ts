import { z } from 'zod';
import type { Platform } from '../schemas/monitor.ts';
import { env } from '../util/env.ts';
import { formatError } from '../util/error.ts';
import { composioUserIdFor, upsertConnectedAccount } from './accounts.ts';
import { getComposioClient } from './client.ts';
import { PLATFORM_LABEL, parsePlatform, resolveAuthConfigId } from './slugs.ts';

/** Path Composio redirects the browser to after the OAuth handshake completes. */
export const OAUTH_CALLBACK_PATH = '/integrations/callback';

/** Resolve the public origin the OAuth callback is served from. */
function publicBaseUrl(): string {
  return env.PUBLIC_BASE_URL ?? new URL(env.SLACK_REDIRECT_URI).origin;
}

/** Outcome of starting a connection flow. */
export type StartConnectionResult =
  | { type: 'ok'; redirectUrl: string }
  | { type: 'not_configured'; platform: Platform }
  | { type: 'error'; error: string };

/**
 * Begin an OAuth connection for a Slack user + platform. Builds a callback URL
 * carrying the workspace/user/platform context, asks Composio to initiate the
 * flow, and returns the provider authorization URL the user should open.
 */
export async function startConnection({
  slackInstallId,
  slackUserId,
  platform,
}: {
  slackInstallId: string;
  slackUserId: string;
  platform: Platform;
}): Promise<StartConnectionResult> {
  const clientResult = getComposioClient();
  if (clientResult.type === 'not_configured') {
    return { type: 'error', error: 'Composio is not configured (missing COMPOSIO_API_KEY).' };
  }
  const authConfig = resolveAuthConfigId(platform);
  if (authConfig.type === 'missing') return { type: 'not_configured', platform };

  const composioUserId = composioUserIdFor({ slackInstallId, slackUserId });
  const callbackUrl = new URL(OAUTH_CALLBACK_PATH, publicBaseUrl());
  callbackUrl.searchParams.set('slackInstallId', slackInstallId);
  callbackUrl.searchParams.set('slackUserId', slackUserId);
  callbackUrl.searchParams.set('platform', platform);

  try {
    const connectionRequest = await clientResult.client.connectedAccounts.initiate(
      composioUserId,
      authConfig.authConfigId,
      {
        allowMultiple: true,
        callbackUrl: callbackUrl.toString(),
      },
    );
    const redirectUrl = connectionRequest.redirectUrl;
    if (redirectUrl == null || redirectUrl.length === 0) {
      return { type: 'error', error: `Composio did not return an authorization URL for ${PLATFORM_LABEL[platform]}.` };
    }
    return { type: 'ok', redirectUrl };
  } catch (e) {
    return { type: 'error', error: formatError(e) };
  }
}

/** Query params on the OAuth callback: our context plus what Composio appends. */
export const OAuthCallbackQuerySchema = z.object({
  slackInstallId: z.string().min(1),
  slackUserId: z.string().min(1),
  platform: z.string().min(1),
  status: z.enum(['success', 'failed']).optional(),
  connectedAccountId: z.string().min(1).optional(),
});
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;

// Loose view of a Composio connected-account state, just enough to read scopes.
const AccountStateSchema = z.object({ val: z.record(z.string(), z.unknown()).optional() }).partial();

/** Normalize the many shapes an OAuth `scope` value can take into a string array. */
function extractScopes(state: unknown): string[] {
  const parsed = AccountStateSchema.safeParse(state);
  const scope = parsed.success ? parsed.data.val?.scope : undefined;
  if (Array.isArray(scope)) return scope.filter((s): s is string => typeof s === 'string');
  if (typeof scope === 'string' && scope.includes(' ')) return scope.split(' ').filter(Boolean);
  if (typeof scope === 'string' && scope.includes(',')) return scope.split(',').filter(Boolean);
  if (typeof scope === 'string' && scope.length > 0) return [scope];
  return [];
}

/** Result of handling the OAuth callback. */
export type OAuthCallbackResult =
  { type: 'ok'; platform: Platform } | { type: 'failed'; platform: Platform | null; error: string };

/**
 * Persist a connected account after the user completes OAuth. Fetches the live
 * account from Composio to record its granted scopes, then upserts our row.
 */
export async function handleOAuthCallback(query: OAuthCallbackQuery): Promise<OAuthCallbackResult> {
  const platform = parsePlatform(query.platform);
  if (platform == null) return { type: 'failed', platform: null, error: `Unknown platform "${query.platform}".` };
  if (query.status === 'failed') return { type: 'failed', platform, error: 'Authorization was cancelled or failed.' };
  if (query.connectedAccountId == null) {
    return { type: 'failed', platform, error: 'Composio did not return a connected account id.' };
  }

  const clientResult = getComposioClient();
  if (clientResult.type === 'not_configured') {
    return { type: 'failed', platform, error: 'Composio is not configured.' };
  }

  try {
    const account = await clientResult.client.connectedAccounts.get(query.connectedAccountId);
    const scopes = extractScopes(account.state);
    await upsertConnectedAccount({
      slackInstallId: query.slackInstallId,
      slackUserId: query.slackUserId,
      composioUserId: composioUserIdFor({ slackInstallId: query.slackInstallId, slackUserId: query.slackUserId }),
      platform,
      composioAccountId: query.connectedAccountId,
      status: 'active',
      scopes,
      uniqueIdentifier: null,
    });
    return { type: 'ok', platform };
  } catch (e) {
    return { type: 'failed', platform, error: formatError(e) };
  }
}
