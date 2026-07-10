import { z } from 'zod';

const SlackApiErrorSchema = z.object({ data: z.object({ error: z.string() }) });

/**
 * Format an unknown thrown value into a human-readable string.
 * Surfaces Slack API error codes (`e.data.error`) when present.
 */
export function formatError(e: unknown): string {
  const slackError = SlackApiErrorSchema.safeParse(e);
  if (slackError.success) return slackError.data.data.error;
  if (e instanceof Error) return e.message;
  return String(e);
}
