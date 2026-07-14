import { formatError } from './error.ts';

/**
 * Standard outcome shape used across the codebase so callers never have to
 * wrap work in try/catch: a successful call carries `data`, a failed one
 * carries a human-readable `error`. Neither variant throws.
 */
export type Result<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Run `fn` and capture its outcome as a {@link Result}. Any thrown value is
 * turned into `{ success: false, error }` via {@link formatError}, so callers
 * can branch on `.success` and gracefully skip failures instead of crashing.
 */
export async function safe<T>(fn: () => Promise<T> | T): Promise<Result<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (e) {
    return { success: false, error: formatError(e) };
  }
}
