import { z } from 'zod';

import { type Platform, PlatformSchema } from '../schemas/monitor.ts';
import { env } from '../util/env.ts';

/**
 * Composio toolkit slugs. Note Composio names the X toolkit `twitter`, while
 * the rest of Prospector uses `x` for the platform.
 */
export const ToolkitSlugSchema = z.enum(['reddit', 'linkedin', 'twitter']);
export type ToolkitSlug = z.infer<typeof ToolkitSlugSchema>;

const PLATFORM_TO_TOOLKIT: Record<Platform, ToolkitSlug> = {
  reddit: 'reddit',
  linkedin: 'linkedin',
  x: 'twitter',
};

const TOOLKIT_TO_PLATFORM: Record<ToolkitSlug, Platform> = {
  reddit: 'reddit',
  linkedin: 'linkedin',
  twitter: 'x',
};

/** Map a Prospector platform to its Composio toolkit slug. */
export function toolkitSlugForPlatform(platform: Platform): ToolkitSlug {
  return PLATFORM_TO_TOOLKIT[platform];
}

/** Map a Composio toolkit slug back to a Prospector platform. */
export function platformForToolkitSlug(slug: ToolkitSlug): Platform {
  return TOOLKIT_TO_PLATFORM[slug];
}

/** Human-friendly platform label for messages. */
export const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  x: 'X',
};

/** Result of looking up the Composio auth config id for a platform. */
export type AuthConfigResult = { type: 'ok'; authConfigId: string } | { type: 'missing'; platform: Platform };

/**
 * Resolve the Composio auth config id for a platform from the environment.
 * Returns a `missing` result (rather than throwing) so callers can surface a
 * clear "not configured" message to the user.
 */
export function resolveAuthConfigId(platform: Platform): AuthConfigResult {
  const byPlatform: Record<Platform, string > = {
    reddit: env.COMPOSIO_AUTH_CONFIG_REDDIT,
    linkedin: env.COMPOSIO_AUTH_CONFIG_LINKEDIN,
    x: env.COMPOSIO_AUTH_CONFIG_TWITTER,
  };
  const authConfigId = byPlatform[platform];
  if (authConfigId == null) return { type: 'missing', platform };
  return { type: 'ok', authConfigId };
}

/** Parse a platform value coming from an untrusted source (e.g. OAuth callback query). */
export function parsePlatform(value: unknown): Platform | null {
  const parsed = PlatformSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
