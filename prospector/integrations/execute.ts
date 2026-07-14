import type { z } from 'zod';

import { formatError } from '../util/error.ts';
import { getComposioClient } from './client.ts';
import type { RegisteredToolId } from './schemas/index.ts';

/** Outcome of executing a Composio tool, with the parsed, typed output. */
export type ToolExecuteResult<T> = { type: 'ok'; output: T } | { type: 'error'; error: string };

/**
 * Execute a registered Composio tool against a specific connected account.
 * The caller passes the tool's input/output Zod schemas (from
 * `integrations/schemas`), so arguments are validated before the call and the
 * response after — giving a fully typed result with no casts.
 */
export async function executeTool<In extends Record<string, unknown>, Out>({
  toolId,
  input,
  output,
  args,
  composioUserId,
  composioAccountId,
}: {
  toolId: RegisteredToolId;
  input: z.ZodType<In>;
  output: z.ZodType<Out>;
  args: In;
  composioUserId: string;
  composioAccountId?: string;
}): Promise<ToolExecuteResult<Out>> {
  const clientResult = getComposioClient();
  if (clientResult.type === 'not_configured') {
    return { type: 'error', error: 'Composio is not configured (missing COMPOSIO_API_KEY).' };
  }

  const inputParse = input.safeParse(args);
  if (!inputParse.success) {
    return { type: 'error', error: `Invalid arguments for ${toolId}: ${inputParse.error.message}` };
  }

  try {
    const raw = await clientResult.client.tools.execute(toolId, {
      userId: composioUserId,
      connectedAccountId: composioAccountId,
      arguments: inputParse.data,
      version: 'latest',
      dangerouslySkipVersionCheck: true,
    });
    const outputParse = output.safeParse(raw);
    if (!outputParse.success) {
      return { type: 'error', error: `Unexpected ${toolId} response shape: ${outputParse.error.message}` };
    }
    return { type: 'ok', output: outputParse.data };
  } catch (e) {
    return { type: 'error', error: formatError(e) };
  }
}
