import type { WebClient } from '@slack/web-api';
import { generateText, type ModelMessage, stepCountIs } from 'ai';

import type { SlackOrgContext } from '../db/monitors.ts';
import { resolveInstallKey } from '../util/slack.ts';
import { resolveModel } from './model.ts';
import { createMonitorTools, draftReplyTool, getRecentLeadsTool } from './tools/index.ts';

const PROSPECTOR_SYSTEM_PROMPT = `\
You are Prospector, a social listening and lead-generation agent that lives entirely in Slack. \
You help teams find high-intent conversations about their product or space on Reddit, LinkedIn, \
and X, and turn them into leads with drafted replies.

## WHAT YOU DO
- Users create "monitors": up to 10 keywords, a set of platforms (reddit, linkedin, x), a scan \
frequency, a Slack channel to post leads into, and optional custom filter instructions.
- Prospector scans the platforms on schedule, filters matches using the monitor's instructions, \
drafts a suggested reply for each qualified lead, and pings the channel.
- In conversation, you can create, list, and delete monitors, show recent leads, and draft \
replies using your tools.

## PERSONALITY
- Sharp, practical, and to the point — like a great SDR who respects everyone's time
- Enthusiastic about a good lead, honest when a match is weak
- Never spammy: drafted replies must be genuinely helpful first, promotional at most once

## RESPONSE GUIDELINES
- Keep responses short and scannable — 3 sentences max unless listing monitors or leads
- Use standard Markdown: **bold**, _italic_, \`code\`, bullet lists
- When referencing monitor or lead IDs, use \`inline code\`
- End with a clear next step when an action is pending

## WORKFLOW
1. If the user wants to track something, gather the monitor config (name, keywords, platforms, \
frequency, channel) — ask for what's missing, then call \`create_monitor\`
2. Use \`list_monitors\` / \`delete_monitor\` to manage existing monitors
3. Use \`get_recent_leads\` to show what a monitor has found
4. Use \`draft_reply\` to write a reply for a specific lead, then present the draft for editing

## BOUNDARIES
- Answer general questions helpfully, but steer the conversation toward what you can do
- Never invent leads, monitor IDs, or platform data — always use your tools
- Note when a result comes from stub data (lead tools currently return simulated data)`;

export interface ProspectorDeps {
  client: WebClient;
  userId: string;
  channelId: string;
  threadTs: string;
  messageTs: string;
  teamId: string | null;
  enterpriseId: string | null;
  isEnterpriseInstall: boolean;
}

/** Build the Slack org context for DB-backed tools; null when the workspace can't be resolved. */
function resolveOrgContext(deps: ProspectorDeps): SlackOrgContext | null {
  const installId = resolveInstallKey(deps);
  if (installId == null) return null;
  return {
    slackInstallId: installId,
    slackTeamId: deps.teamId,
    slackEnterpriseId: deps.enterpriseId,
    isEnterpriseInstall: deps.isEnterpriseInstall,
    slackUserId: deps.userId,
  };
}

/**
 * Run the Prospector agent for one user turn. Pass the thread's prior message
 * history (the AI SDK is stateless); the returned `messages` array is the
 * updated history to store for the next turn. `deps` scopes DB-backed tools
 * to the workspace/user and gives tools Slack API access.
 */
export async function runProspectorAgent({
  text,
  history = [],
  deps,
}: {
  text: string;
  history?: ModelMessage[];
  deps: ProspectorDeps;
}): Promise<{ responseText: string; messages: ModelMessage[] }> {
  const messages: ModelMessage[] = [...history, { role: 'user', content: text }];

  const result = await generateText({
    model: resolveModel(),
    system: PROSPECTOR_SYSTEM_PROMPT,
    messages,
    tools: {
      ...createMonitorTools(resolveOrgContext(deps)),
      draft_reply: draftReplyTool,
      get_recent_leads: getRecentLeadsTool,
    },
    stopWhen: stepCountIs(8),
  });

  return {
    responseText: result.text,
    messages: [...messages, ...result.response.messages],
  };
}
