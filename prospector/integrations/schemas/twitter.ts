/**
 * Typed Zod schemas for the X (Twitter) Composio tools Prospector uses to reply
 * to tweets. Replying is done by creating a post with
 * `reply_in_reply_to_tweet_id`; X has no edit-comment endpoint.
 *
 * @see https://docs.composio.dev/toolkits/twitter
 */
import { z } from 'zod';

/** Reusable wrapper for an action that only needs a success flag + error. */
const TwitterActionMetaSchema = {
  error: z.string().nullish(),
  successful: z.boolean(),
};

export const TwitterCreationOfAPostInputSchema = z.object({
  text: z
    .string()
    .nullish()
    .describe('Tweet text (≤280 chars for most accounts). Required unless media/quote is provided.'),
  media_media_ids: z.array(z.string()).nullish().describe('Up to 4 media IDs from prior uploads to attach.'),
  quote_tweet_id: z.string().nullish().describe('Numeric ID of a tweet to quote.'),
  reply_in_reply_to_tweet_id: z
    .string()
    .nullish()
    .describe('Numeric ID of the tweet to reply to. Set this to post a comment/reply on an existing tweet.'),
  reply_settings: z
    .enum(['following', 'mentionedUsers', 'subscribers'])
    .nullish()
    .describe('Who can reply to this tweet.'),
});
export type TwitterCreationOfAPostInput = z.infer<typeof TwitterCreationOfAPostInputSchema>;

export const TwitterCreationOfAPostOutputSchema = z.object({
  data: z.object({
    data: z.object({ id: z.string().nullish().describe('ID of the created tweet.') }).nullish(),
  }),
  ...TwitterActionMetaSchema,
});
export type TwitterCreationOfAPostOutput = z.infer<typeof TwitterCreationOfAPostOutputSchema>;

export const TwitterPostDeleteByPostIdInputSchema = z.object({
  id: z.string().describe('Numeric ID of the tweet to delete (must be yours).'),
});
export type TwitterPostDeleteByPostIdInput = z.infer<typeof TwitterPostDeleteByPostIdInputSchema>;

export const TwitterPostDeleteByPostIdOutputSchema = z.object({
  data: z.object({
    data: z.object({ deleted: z.boolean() }).nullish(),
  }),
  ...TwitterActionMetaSchema,
});
export type TwitterPostDeleteByPostIdOutput = z.infer<typeof TwitterPostDeleteByPostIdOutputSchema>;
