import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

import { formatError } from '../../util/error.ts';
import { buildAppHomeView } from '../views/app-home-builder.ts';

const SUGGESTED_PROMPTS = [
  { title: 'Create a monitor', message: 'I want to create a monitor to track keywords on Reddit and X' },
  { title: 'Show my monitors', message: 'List all my monitors' },
  { title: 'Recent leads', message: 'Show me the recent leads from my monitors' },
];

/**
 * Handle app_home_opened events. Under agent_view, this event fires for both
 * the Home tab and the Messages tab (the agent DM). Branch on event.tab:
 *   - 'messages' → pin suggested prompts to the top of the DM
 *   - 'home'     → publish the App Home Block Kit view
 */
export async function handleAppHomeOpened({
  client,
  event,
  context,
  logger,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_home_opened'>): Promise<void> {
  try {
    if (event.tab === 'messages') {
      // Under agent_view, suggested prompts pin to the top of the Messages
      // tab — thread_ts is required by the types but unused for pinned prompts.
      await client.assistant.threads.setSuggestedPrompts({
        channel_id: event.channel,
        thread_ts: '',
        title: 'How can I help you today?',
        prompts: SUGGESTED_PROMPTS,
      });
      return;
    }

    const userId = context.userId;
    if (userId == null) return;

    const view = buildAppHomeView(context.botUserId ?? null);
    await client.views.publish({ user_id: userId, view });
  } catch (e) {
    logger.error(`Failed to handle app_home_opened: ${formatError(e)}`);
  }
}
