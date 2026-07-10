import type { AllMiddlewareArgs, BlockFeedbackButtonsAction, SlackActionMiddlewareArgs } from '@slack/bolt';

import { formatError } from '../../util/error.ts';

/**
 * Handle thumbs up/down feedback on agent responses with an ephemeral reply.
 */
export async function handleFeedbackButton({
  ack,
  body,
  client,
  context,
  logger,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockFeedbackButtonsAction>): Promise<void> {
  await ack();

  try {
    const userId = context.userId;
    const channelId = body.channel?.id;
    const messageTs = body.message?.ts;
    if (userId == null || channelId == null || messageTs == null) return;

    const feedbackValue = body.actions.at(0)?.value;
    const text =
      feedbackValue === 'good-feedback'
        ? 'Glad that was helpful! :tada:'
        : "Sorry that wasn't helpful. :slightly_frowning_face: Try rephrasing your question.";

    await client.chat.postEphemeral({ channel: channelId, user: userId, thread_ts: messageTs, text });
    logger.debug(`Feedback received: value=${feedbackValue}, message_ts=${messageTs}`);
  } catch (e) {
    logger.error(`Failed to handle feedback: ${formatError(e)}`);
  }
}
