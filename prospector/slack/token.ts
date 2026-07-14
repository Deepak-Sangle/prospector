import { WebClient } from '@slack/web-api';
import { z } from 'zod';
import { prisma } from '../db/client.ts';

// We only need the bot token out of the stored Bolt installation payload.
const InstallationTokenSchema = z.object({ bot: z.object({ token: z.string() }) });

/**
 * Build a Slack WebClient for an install, using the bot token saved during
 * OAuth. Used by the cron worker, which runs outside the Bolt request cycle
 * and therefore has no client injected for it.
 */
export async function getBotClient(slackInstallId: string): Promise<WebClient> {
  const row = await prisma.slackInstallation.findUnique({ where: { slackInstallId } });
  const parsed = InstallationTokenSchema.safeParse(row?.installation);
  if (!parsed.success) throw new Error(`No bot token found for install ${slackInstallId}`);
  return new WebClient(parsed.data.bot.token);
}
