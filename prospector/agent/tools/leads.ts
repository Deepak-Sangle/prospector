import { tool } from 'ai';
import { z } from 'zod';

import type { Lead } from '../../schemas/monitor.ts';

// STUB: canned leads, replaced by real platform scan results later.
const STUB_LEADS: Lead[] = [
  {
    id: 'lead_1',
    monitorId: 'mon_1',
    platform: 'reddit',
    author: 'u/startup_sam',
    url: 'https://reddit.com/r/smallbusiness/comments/example1',
    content:
      "We're drowning in manual follow-ups across three tools. Is there any Slack bot that can watch for mentions of our product and draft responses? Willing to pay.",
    matchedKeywords: ['slack bot'],
    foundAt: new Date().toISOString(),
  },
  {
    id: 'lead_2',
    monitorId: 'mon_1',
    platform: 'x',
    author: '@growth_gina',
    url: 'https://x.com/growth_gina/status/example2',
    content:
      'Looking for recommendations: best workflow automation setup for a 10-person sales team that lives in Slack?',
    matchedKeywords: ['workflow automation'],
    foundAt: new Date().toISOString(),
  },
];

function formatLead(lead: Lead): string {
  return [
    `*${lead.author}* on ${lead.platform} (\`${lead.id}\`)`,
    `> ${lead.content}`,
    `Matched: ${lead.matchedKeywords.join(', ')} | <${lead.url}|View post>`,
  ].join('\n');
}

export const getRecentLeadsTool = tool({
  description: 'Get the most recent leads (matching posts/threads) found by a monitor across its configured platforms.',
  inputSchema: z.object({
    monitorId: z.string().describe('The monitor ID to fetch leads for. Example: "mon_1"'),
  }),
  execute: async ({ monitorId }) => {
    const leads = STUB_LEADS.filter((lead) => lead.monitorId === monitorId);
    if (leads.length === 0) return `No recent leads for monitor \`${monitorId}\`.`;
    return leads.map(formatLead).join('\n\n');
  },
});

export const draftReplyTool = tool({
  description:
    'Fetch the full content of a lead so you can draft a reply the user can copy, edit, and post on the platform themselves. ' +
    'After calling, write a short, genuinely helpful, non-spammy reply tailored to the lead.',
  inputSchema: z.object({
    leadId: z.string().describe('The lead ID to draft a reply for. Example: "lead_1"'),
  }),
  execute: async ({ leadId }) => {
    const lead = STUB_LEADS.find((candidate) => candidate.id === leadId);
    if (!lead) return `No lead found with ID \`${leadId}\`.`;
    return (
      `Lead by ${lead.author} on ${lead.platform}:\n"${lead.content}"\n\n` +
      'Draft a short, genuinely helpful reply in the voice of a friendly practitioner. ' +
      'Mention the product at most once, never pushy.'
    );
  },
});
