/**
 * Typed Zod schemas for the LinkedIn Composio tools Prospector uses to comment
 * on posts. Commenting needs the author's own URN (from LINKEDIN_GET_MY_INFO)
 * plus the target post URN.
 *
 * @see https://docs.composio.dev/toolkits/linkedin
 */
import { z } from 'zod';

export const LinkedinGetMyInfoInputSchema = z.object({});
export type LinkedinGetMyInfoInput = z.infer<typeof LinkedinGetMyInfoInputSchema>;

export const LinkedinGetMyInfoOutputSchema = z.object({
  data: z
    .object({
      id: z.string().describe("Person URN of the authenticated user, e.g. 'urn:li:person:abc123'.").nullish(),
      localizedLastName: z.string().nullish(),
      localizedFirstName: z.string().nullish(),
    })
    .nullish(),
  successful: z.boolean(),
  error: z.string().nullish(),
});
export type LinkedinGetMyInfoOutput = z.infer<typeof LinkedinGetMyInfoOutputSchema>;

export const LinkedinCreateCommentOnPostInputSchema = z.object({
  actor: z.string().describe("URN of the commenter. Person: 'urn:li:person:{id}', org: 'urn:li:organization:{id}'."),
  target_urn: z
    .string()
    .describe("URN of the post to comment on: 'urn:li:share:{id}', 'urn:li:ugcPost:{id}', or 'urn:li:activity:{id}'."),
  object: z
    .string()
    .describe('URN of the share/ugcPost containing the comment. Same as target_urn for top-level comments.'),
  message: z.object({
    text: z.string().min(1).max(1250).describe('Comment text (supports @-mentions). Max 1250 chars.'),
  }),
});
export type LinkedinCreateCommentOnPostInput = z.infer<typeof LinkedinCreateCommentOnPostInputSchema>;

export const LinkedinCreateCommentOnPostOutputSchema = z.object({
  data: z
    .object({
      id: z.string().describe('URN of the created comment').nullish(),
    })
    .describe('Result data'),
  error: z.string().nullish(),
  successful: z.boolean(),
});
export type LinkedinCreateCommentOnPostOutput = z.infer<typeof LinkedinCreateCommentOnPostOutputSchema>;
