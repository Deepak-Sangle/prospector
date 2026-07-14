import { buildLeadBlocks, type LeadCard } from './blocks.ts';
import { getBotClient } from './token.ts';

/**
 * Post a single lead card into the monitor's Slack channel. Returns the message
 * `ts` so the caller can store it on the result. `client` can be supplied (e.g.
 * from a Bolt handler); the cron worker omits it and we resolve the bot token.
 */
export async function postLead({
  slackInstallId,
  channelId,
  card,
}: {
  slackInstallId: string;
  channelId: string;
  card: LeadCard;
}): Promise<string | undefined> {
  const client = await getBotClient(slackInstallId);
  const res = await client.chat.postMessage({
    channel: channelId,
    text: `New lead from ${card.author} on ${card.platform}`,
    blocks: buildLeadBlocks(card),
    // Don't let Slack expand the "View original post" link into a big og:image preview.
    unfurl_links: false,
    unfurl_media: false,
  });
  return res.ts;
}
