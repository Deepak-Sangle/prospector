import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { GenericMessageEvent, MessageEvent } from '@slack/types';

import { runProspectorAgent } from '../../agent/index.ts';
import { conversationStore } from '../../thread-context/index.ts';
import { formatError } from '../../util/error.ts';
import { buildFeedbackBlocks } from '../views/feedback-builder.ts';

const LOADING_MESSAGES = [
  'Panning the rivers for gold…',
  'Sifting through the noise…',
  'Following a promising trail…',
  'Polishing up a nugget for you…',
];

function isGenericMessageEvent(event: MessageEvent): event is GenericMessageEvent {
  return !('subtype' in event && event.subtype !== undefined);
}

/**
 * Handle messages sent to Prospector via DM or in threads the bot is part of.
 */
export async function handleMessage({
  client,
  context,
  event,
  logger,
  say,
  sayStream,
  setStatus,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'message'>): Promise<void> {
  // Skip message subtypes (edits, deletes, etc.) and bot messages
  if (!isGenericMessageEvent(event)) return;
  if (event.bot_id) return;

  const isDm = event.channel_type === 'im';
  const isThreadReply = event.thread_ts != null;

  if (!isDm) {
    // Top-level channel messages are handled by app_mentioned; channel thread
    // replies are handled only if the bot is already engaged in the thread
    if (!isThreadReply) return;
    const engaged = conversationStore.getMessages(event.channel, event.thread_ts ?? '');
    if (engaged === null) return;
  }

  try {
    const channelId = event.channel;
    const text = event.text || '';
    const threadTs = event.thread_ts || event.ts;
    const userId = context.userId;
    if (userId == null) return;

    const history = conversationStore.getMessages(channelId, threadTs) ?? [];

    // Add eyes reaction only to the first message (DMs only — channel
    // threads already have the reaction from the initial app_mention)
    if (isDm && history.length === 0) {
      await client.reactions.add({ channel: channelId, timestamp: event.ts, name: 'eyes' });
    }

    await setStatus({ status: 'Prospecting…', loading_messages: LOADING_MESSAGES });

    const deps = {
      client,
      userId,
      channelId,
      threadTs,
      messageTs: event.ts,
      teamId: context.teamId ?? null,
      enterpriseId: context.enterpriseId ?? null,
      isEnterpriseInstall: context.isEnterpriseInstall === true,
    };
    const { responseText, messages } = await runProspectorAgent({ text, history, deps });

    const streamer = sayStream();
    await streamer.append({ markdown_text: responseText });
    await streamer.stop({ blocks: buildFeedbackBlocks() });

    conversationStore.setMessages(channelId, threadTs, messages);
  } catch (e) {
    logger.error(`Failed to handle message: ${formatError(e)}`);
    await say({
      text: `:warning: Something went wrong! (${formatError(e)})`,
      thread_ts: event.thread_ts || event.ts,
    });
  }
}
