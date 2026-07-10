import type { HomeView, KnownBlock } from '@slack/types';

/**
 * Build the App Home view: what Prospector does and how to talk to it.
 */
export function buildAppHomeView(botUserId: string | null = null): HomeView {
  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '⛏️ Prospector — find your next customer where they already talk' },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          'Prospector watches *Reddit, LinkedIn, and X* for conversations that match your keywords, ' +
          'filters them with your custom instructions, drafts a reply, and pings your channel.\n\n' +
          '*Get started:* send me a DM and say something like ' +
          '`create a monitor for "slack automation" on reddit, daily, post to #leads`.',
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '*What I can do today:*\n' +
          '• Create, list, and delete monitors (up to 10 keywords each)\n' +
          '• Show recent leads a monitor has found\n' +
          '• Draft a helpful, non-spammy reply for any lead',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Mention me in any channel${botUserId ? ` with <@${botUserId}>` : ''} or send me a DM.`,
        },
      ],
    },
  ];

  return { type: 'home', blocks };
}
