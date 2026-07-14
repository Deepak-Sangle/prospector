import { Bridgly } from 'bridgly';

import { env } from '../util/env.ts';

// The SDK's built-in default base URL points at api.bridgly.io, which no longer
// resolves; the live API is served from api.bridgly.app.
const BRIDGLY_BASE_URL = 'https://api.bridgly.app';

/** Shared, fully-typed Bridgly client. Reused across every search call. */
export const bridgly = new Bridgly({ apiKey: env.BRIDGLY_API_KEY, baseUrl: BRIDGLY_BASE_URL });
