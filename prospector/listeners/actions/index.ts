import type { App } from '@slack/bolt';

import { SEND_REPLY_ACTION, TOGGLE_CONTENT_ACTION } from '../../slack/blocks.ts';
import { handleFeedbackButton } from './feedback-buttons.ts';
import { handleSendReply } from './send-reply.ts';
import { handleToggleContent } from './toggle-content.ts';

/**
 * Register action listeners with the Bolt app.
 */
export function register(app: App): void {
  app.action('feedback', handleFeedbackButton);
  app.action(SEND_REPLY_ACTION, handleSendReply);
  app.action(TOGGLE_CONTENT_ACTION, handleToggleContent);
}
