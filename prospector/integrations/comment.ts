import type { Platform } from '../schemas/monitor.ts';
import { executeTool } from './execute.ts';
import {
  LinkedinCreateCommentOnPostInputSchema,
  LinkedinCreateCommentOnPostOutputSchema,
  LinkedinGetMyInfoInputSchema,
  LinkedinGetMyInfoOutputSchema,
  RedditPostRedditCommentInputSchema,
  RedditPostRedditCommentOutputSchema,
  TwitterCreationOfAPostInputSchema,
  TwitterCreationOfAPostOutputSchema,
} from './schemas/index.ts';

/** Outcome of posting a reply to a source platform. */
export type SendCommentResult = { type: 'ok'; postedId: string | null } | { type: 'error'; error: string };

/** Resolve a Reddit thing fullname (t3_… / t1_…) from the stored id or the post URL. */
function resolveRedditThingId(externalId: string | null, url: string): string | null {
  if (externalId != null && /^t[0-9]_/.test(externalId)) return externalId;
  if (externalId != null && externalId.length > 0) return `t3_${externalId}`;
  const id = url.match(/\/comments\/([a-z0-9]+)/i)?.[1];
  return id != null ? `t3_${id}` : null;
}

/** Resolve a numeric X tweet id from the stored id or the tweet URL. */
function resolveTweetId(externalId: string | null, url: string): string | null {
  if (externalId != null && /^\d+$/.test(externalId)) return externalId;
  return url.match(/status\/(\d+)/)?.[1] ?? null;
}

/** Resolve a LinkedIn post URN from the stored urn or the post URL. */
function resolveLinkedInUrn(externalId: string | null, url: string): string | null {
  if (externalId?.startsWith('urn:li:')) return externalId;
  const fullUrn = url.match(/urn:li:(?:activity|share|ugcPost):[0-9]+/)?.[0];
  if (fullUrn != null) return fullUrn;
  const activityId = url.match(/activity[:-]([0-9]+)/)?.[1];
  return activityId != null ? `urn:li:activity:${activityId}` : null;
}

/** Post a Reddit comment on a post/comment fullname. */
async function sendRedditComment({
  externalId,
  url,
  text,
  composioUserId,
  composioAccountId,
}: {
  externalId: string | null;
  url: string;
  text: string;
  composioUserId: string;
  composioAccountId: string;
}): Promise<SendCommentResult> {
  const thingId = resolveRedditThingId(externalId, url);
  if (thingId == null) return { type: 'error', error: 'Could not determine the Reddit post id from the lead.' };

  const res = await executeTool({
    toolId: 'REDDIT_POST_REDDIT_COMMENT',
    input: RedditPostRedditCommentInputSchema,
    output: RedditPostRedditCommentOutputSchema,
    args: { thing_id: thingId, text },
    composioUserId,
    composioAccountId,
  });
  if (res.type === 'error') return res;
  if (!res.output.successful) return { type: 'error', error: res.output.error ?? 'Reddit rejected the comment.' };
  return { type: 'ok', postedId: res.output.data.id ?? null };
}

/** Reply to a tweet by creating a post with `reply_in_reply_to_tweet_id`. */
async function sendXReply({
  externalId,
  url,
  text,
  composioUserId,
  composioAccountId,
}: {
  externalId: string | null;
  url: string;
  text: string;
  composioUserId: string;
  composioAccountId: string;
}): Promise<SendCommentResult> {
  const tweetId = resolveTweetId(externalId, url);
  if (tweetId == null) return { type: 'error', error: 'Could not determine the tweet id from the lead.' };

  const res = await executeTool({
    toolId: 'TWITTER_CREATION_OF_A_POST',
    input: TwitterCreationOfAPostInputSchema,
    output: TwitterCreationOfAPostOutputSchema,
    args: { text, reply_in_reply_to_tweet_id: tweetId },
    composioUserId,
    composioAccountId,
  });
  if (res.type === 'error') return res;
  if (!res.output.successful) return { type: 'error', error: res.output.error ?? 'X rejected the reply.' };
  return { type: 'ok', postedId: res.output.data.data?.id ?? null };
}

/** Comment on a LinkedIn post; needs the commenter's own URN from GET_MY_INFO. */
async function sendLinkedInComment({
  externalId,
  url,
  text,
  composioUserId,
  composioAccountId,
}: {
  externalId: string | null;
  url: string;
  text: string;
  composioUserId: string;
  composioAccountId: string;
}): Promise<SendCommentResult> {
  const targetUrn = resolveLinkedInUrn(externalId, url);
  if (targetUrn == null) return { type: 'error', error: 'Could not determine the LinkedIn post URN from the lead.' };

  const me = await executeTool({
    toolId: 'LINKEDIN_GET_MY_INFO',
    input: LinkedinGetMyInfoInputSchema,
    output: LinkedinGetMyInfoOutputSchema,
    args: {},
    composioUserId,
    composioAccountId,
  });
  if (me.type === 'error') return me;
  const actor = me.output.data?.id;
  if (actor == null) return { type: 'error', error: 'Could not resolve your LinkedIn identity.' };

  const res = await executeTool({
    toolId: 'LINKEDIN_CREATE_COMMENT_ON_POST',
    input: LinkedinCreateCommentOnPostInputSchema,
    output: LinkedinCreateCommentOnPostOutputSchema,
    args: { actor, target_urn: targetUrn, object: targetUrn, message: { text } },
    composioUserId,
    composioAccountId,
  });
  if (res.type === 'error') return res;
  if (!res.output.successful) return { type: 'error', error: res.output.error ?? 'LinkedIn rejected the comment.' };
  return { type: 'ok', postedId: res.output.data.id ?? null };
}

/**
 * Post a reply to the original social post behind a lead, using the user's
 * connected account. Dispatches to the right Composio tool per platform.
 */
export function sendComment({
  platform,
  externalId,
  url,
  text,
  composioUserId,
  composioAccountId,
}: {
  platform: Platform;
  externalId: string | null;
  url: string;
  text: string;
  composioUserId: string;
  composioAccountId: string;
}): Promise<SendCommentResult> {
  const params = { externalId, url, text, composioUserId, composioAccountId };
  if (platform === 'reddit') return sendRedditComment(params);
  if (platform === 'x') return sendXReply(params);
  return sendLinkedInComment(params);
}
