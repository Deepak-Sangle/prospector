import type { AllMiddlewareArgs, BlockButtonAction, SlackActionMiddlewareArgs } from '@slack/bolt';
import { prisma } from '../../db/client.ts';
import { buildLeadBlocks, decodeToggleValue, REPLY_INPUT_ACTION, REPLY_INPUT_BLOCK } from '../../slack/blocks.ts';
import { formatError } from '../../util/error.ts';

/**
 * Handle the "Show more"/"Show less" toggle on a lead card. Rebuilds the card in
 * the requested state and updates the message in place, preserving whatever the
 * user has typed into the editable reply box.
 */
export async function handleToggleContent({
  ack,
  body,
  client,
  logger,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockButtonAction>): Promise<void> {
  await ack();

  try {
    const value = body.actions.at(0)?.value;
    const channelId = body.channel?.id;
    const messageTs = body.message?.ts;
    if (value == null || channelId == null || messageTs == null) return;

    const { resultId, expand } = decodeToggleValue(value);

    const result = await prisma.monitorResult.findUnique({
      where: { id: resultId },
      include: { replies: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (result == null) return;

    // Keep the user's edited reply text; fall back to the latest saved draft.
    const editedText = body.state?.values?.[REPLY_INPUT_BLOCK]?.[REPLY_INPUT_ACTION]?.value;
    const draftReply = editedText ?? result.replies.at(0)?.content ?? '';

    await client.chat.update({
      channel: channelId,
      ts: messageTs,
      text: `New lead from ${result.author} on ${result.platform}`,
      blocks: buildLeadBlocks({
        platform: result.platform,
        author: result.author,
        url: result.url,
        content: result.content,
        matchedKeywords: result.matchedKeywords,
        draftReply,
        resultId: result.id,
        expanded: expand,
      }),
    });
  } catch (e) {
    logger.error(`Failed to toggle lead content: ${formatError(e)}`);
  }
}
