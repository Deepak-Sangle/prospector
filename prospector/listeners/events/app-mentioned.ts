import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

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

/**
 * Handle app_mention events and run the Prospector agent.
 */
export async function handleAppMentioned({
  client,
  context,
  event,
  logger,
  say,
  sayStream,
  setStatus,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>): Promise<void> {
  try {
    const channelId = event.channel;
    const threadTs = event.thread_ts || event.ts;
    const userId = context.userId;
    if (userId == null) return;

    const cleanedText = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
    if (!cleanedText) {
      await say({
        text: 'Hey there! Ask me to create a monitor, list your monitors, or show recent leads.',
        thread_ts: threadTs,
      });
      return;
    }

    // Add eyes reaction only to the first message (not threaded replies)
    if (!event.thread_ts) {
      await client.reactions.add({ channel: channelId, timestamp: event.ts, name: 'eyes' });
    }

    await setStatus({ status: 'Prospecting…', loading_messages: LOADING_MESSAGES });

    const history = conversationStore.getMessages(channelId, threadTs) ?? [];
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
    const { responseText, messages } = await runProspectorAgent({ text: cleanedText, history, deps });

    const streamer = sayStream();
    await streamer.append({ markdown_text: responseText });
    await streamer.stop({ blocks: buildFeedbackBlocks() });

    conversationStore.setMessages(channelId, threadTs, messages);
  } catch (e) {
    logger.error(`Failed to handle app mention: ${formatError(e)}`);
    await say({
      text: `:warning: Something went wrong! (${formatError(e)})`,
      thread_ts: event.thread_ts || event.ts,
    });
  }
}
