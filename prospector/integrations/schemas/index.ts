/**
 * Single source of truth mapping Composio tool ids to their input/output Zod
 * schemas. Keeps tool execution fully typed end to end.
 */
import * as Linkedin from './linkedin.ts';
import * as Reddit from './reddit.ts';
import * as Twitter from './twitter.ts';

export * from './linkedin.ts';
export * from './reddit.ts';
export * from './twitter.ts';

export const ToolSchemaRegistry = {
  REDDIT_POST_REDDIT_COMMENT: {
    input: Reddit.RedditPostRedditCommentInputSchema,
    output: Reddit.RedditPostRedditCommentOutputSchema,
  },
  REDDIT_EDIT_REDDIT_COMMENT_OR_POST: {
    input: Reddit.RedditEditRedditCommentOrPostInputSchema,
    output: Reddit.RedditEditRedditCommentOrPostOutputSchema,
  },
  REDDIT_DELETE_REDDIT_COMMENT: {
    input: Reddit.RedditDeleteRedditCommentInputSchema,
    output: Reddit.RedditDeleteRedditCommentOutputSchema,
  },
  TWITTER_CREATION_OF_A_POST: {
    input: Twitter.TwitterCreationOfAPostInputSchema,
    output: Twitter.TwitterCreationOfAPostOutputSchema,
  },
  TWITTER_POST_DELETE_BY_POST_ID: {
    input: Twitter.TwitterPostDeleteByPostIdInputSchema,
    output: Twitter.TwitterPostDeleteByPostIdOutputSchema,
  },
  LINKEDIN_GET_MY_INFO: {
    input: Linkedin.LinkedinGetMyInfoInputSchema,
    output: Linkedin.LinkedinGetMyInfoOutputSchema,
  },
  LINKEDIN_CREATE_COMMENT_ON_POST: {
    input: Linkedin.LinkedinCreateCommentOnPostInputSchema,
    output: Linkedin.LinkedinCreateCommentOnPostOutputSchema,
  },
};

/** All Composio tool ids that have registered schemas. */
export type RegisteredToolId = keyof typeof ToolSchemaRegistry;
