import type { App } from '@slack/bolt';

import { handleAppHomeOpened } from './app-home-opened.ts';
import { handleAppMentioned } from './app-mentioned.ts';
import { handleMessage } from './message.ts';

/**
 * Register event listeners with the Bolt app.
 */
export function register(app: App): void {
  app.event('app_home_opened', handleAppHomeOpened);
  app.event('app_mention', handleAppMentioned);
  app.event('message', handleMessage);
}
