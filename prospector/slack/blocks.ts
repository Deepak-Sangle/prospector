import type { KnownBlock } from '@slack/types';

import type { Platform } from '../schemas/monitor.ts';

/** Action ID for the "Send reply" button on a lead card. */
export const SEND_REPLY_ACTION = 'send_reply';
/** Action ID for the "Show more"/"Show less" toggle on the matched post. */
export const TOGGLE_CONTENT_ACTION = 'toggle_lead_content';
/** Block + action IDs for the editable reply text box. */
export const REPLY_INPUT_BLOCK = 'reply_input';
export const REPLY_INPUT_ACTION = 'reply_text';

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  x: 'X',
};

/**
 * Slack caps a section's mrkdwn `text` at 3000 characters. We quote the matched
 * post (prefixing each line with `> `), which adds bytes, so cap the raw content
 * below the limit with headroom for the prefixes and append an ellipsis.
 */
const MAX_QUOTE_CHARS = 2800;

/**
 * Length of the collapsed preview shown by default. Long posts are truncated to
 * this many characters with a "Show more" button to reveal the rest.
 */
const PREVIEW_CHARS = 240;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Render post content as a Slack block quote, prefixing each line with `> `. */
function asQuote(text: string): string {
  return `> ${text.replace(/\n/g, '\n> ')}`;
}

/** Encode the toggle button value: the result ID plus the target state. */
export function encodeToggleValue(resultId: string, expand: boolean): string {
  return `${resultId}::${expand ? 'expand' : 'collapse'}`;
}

/** Decode a toggle button value back into its result ID and target state. */
export function decodeToggleValue(value: string): { resultId: string; expand: boolean } {
  const sep = value.lastIndexOf('::');
  const resultId = sep === -1 ? value : value.slice(0, sep);
  const state = sep === -1 ? '' : value.slice(sep + 2);
  return { resultId, expand: state === 'expand' };
}

/** Everything a lead card needs to render. */
export interface LeadCard {
  platform: Platform;
  author: string;
  url: string;
  content: string;
  matchedKeywords: string[];
  draftReply: string;
  /** MonitorResult ID, carried on the Send button so the handler can look it up. */
  resultId: string;
  /** When true, render the full post; otherwise show a truncated preview. */
  expanded?: boolean;
}

/**
 * Build the lead card posted to a monitor's channel: the matched post, an
 * editable text box pre-filled with the drafted reply, and a Send button.
 */
export function buildLeadBlocks(card: LeadCard): KnownBlock[] {
  const full = truncate(card.content, MAX_QUOTE_CHARS);
  const isLong = full.length > PREVIEW_CHARS;
  const expanded = card.expanded ?? false;
  const shown = isLong && !expanded ? truncate(full, PREVIEW_CHARS) : full;

  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*New lead on ${PLATFORM_LABEL[card.platform]}* — from *${card.author}*\nMatched: ${card.matchedKeywords.join(', ')}`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: asQuote(shown) },
    },
  ];

  // Only offer a toggle when the post is long enough to be worth collapsing.
  if (isLong) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: TOGGLE_CONTENT_ACTION,
          text: { type: 'plain_text', text: expanded ? 'Show less' : 'Show more' },
          value: encodeToggleValue(card.resultId, !expanded),
        },
      ],
    });
  }

  blocks.push(
    { type: 'context', elements: [{ type: 'mrkdwn', text: `<${card.url}|View original post>` }] },
    {
      type: 'input',
      block_id: REPLY_INPUT_BLOCK,
      optional: true,
      label: { type: 'plain_text', text: 'Suggested reply (edit before sending)' },
      element: {
        type: 'plain_text_input',
        action_id: REPLY_INPUT_ACTION,
        multiline: true,
        initial_value: card.draftReply,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: SEND_REPLY_ACTION,
          style: 'primary',
          text: { type: 'plain_text', text: 'Send reply' },
          value: card.resultId,
        },
      ],
    },
  );

  return blocks;
}
