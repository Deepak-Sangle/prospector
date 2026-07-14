/**
 * Typed Zod schemas for the Reddit Composio tools Prospector uses to reply to
 * posts. Ported from the Sia integration definitions; Composio wraps every
 * result as `{ data, error, successful }`.
 *
 * @see https://docs.composio.dev/toolkits/reddit
 */
import { z } from 'zod';

export const RedditPostRedditCommentInputSchema = z.object({
  thing_id: z
    .string()
    .describe("Fullname of the parent post ('t3_') or comment ('t1_') to reply to. e.g. 't3_10omtdx'"),
  text: z.string().describe('Markdown text of the comment.'),
});
export type RedditPostRedditCommentInput = z.infer<typeof RedditPostRedditCommentInputSchema>;

export const RedditPostRedditCommentOutputSchema = z.object({
  data: z.object({
    id: z.string().describe("Fullname of the created comment. e.g. 't1_h2g9w8m'").nullish(),
  }),
  error: z.string().nullish(),
  successful: z.boolean().describe('Whether the comment was posted.'),
});
export type RedditPostRedditCommentOutput = z.infer<typeof RedditPostRedditCommentOutputSchema>;

export const RedditEditRedditCommentOrPostInputSchema = z.object({
  thing_id: z.string().describe("Fullname of the comment ('t1_') or self-post ('t3_') to edit. e.g. 't1_c0s4w1c'"),
  text: z.string().describe('New markdown body text.'),
});
export type RedditEditRedditCommentOrPostInput = z.infer<typeof RedditEditRedditCommentOrPostInputSchema>;

export const RedditEditRedditCommentOrPostOutputSchema = z.object({
  data: z.object({}),
  error: z.string().nullish(),
  successful: z.boolean().describe('Whether the edit was applied.'),
});
export type RedditEditRedditCommentOrPostOutput = z.infer<typeof RedditEditRedditCommentOrPostOutputSchema>;

export const RedditDeleteRedditCommentInputSchema = z.object({
  id: z.string().describe("Fullname of the comment to delete. e.g. 't1_c0s4w1c'"),
});
export type RedditDeleteRedditCommentInput = z.infer<typeof RedditDeleteRedditCommentInputSchema>;

export const RedditDeleteRedditCommentOutputSchema = z.object({
  data: z.object({}),
  error: z.string().nullish(),
  successful: z.boolean().describe('Whether the comment was deleted.'),
});
export type RedditDeleteRedditCommentOutput = z.infer<typeof RedditDeleteRedditCommentOutputSchema>;
