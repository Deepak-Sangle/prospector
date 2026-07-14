import { Composio } from '@composio/core';

import { env } from '../util/env.ts';

let composioClient: Composio | null = null;

/** Result of resolving the Composio client. */
export type ComposioClientResult = { type: 'ok'; client: Composio } | { type: 'not_configured' };

/**
 * Get (or lazily create) the shared Composio client. Returns `not_configured`
 * when `COMPOSIO_API_KEY` is unset so callers can respond gracefully instead of
 * crashing the process.
 */
export function getComposioClient(): ComposioClientResult {
  if (env.COMPOSIO_API_KEY == null) return { type: 'not_configured' };
  if (composioClient == null) {
    composioClient = new Composio({ apiKey: env.COMPOSIO_API_KEY });
  }
  return { type: 'ok', client: composioClient };
}
