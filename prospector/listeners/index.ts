import type { App } from '@slack/bolt';

import * as actions from './actions/index.ts';
import * as events from './events/index.ts';
import * as views from './views/index.ts';

/**
 * Register all Slack event, action, and view listeners.
 */
export function registerListeners(app: App): void {
  actions.register(app);
  events.register(app);
  views.register(app);
}
