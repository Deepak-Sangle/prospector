import { generateText } from 'ai';
import type { SocialHit } from '../bridgly/index.ts';
import type { CompanyBrief, MonitorRecord } from '../schemas/db.ts';
import { renderCompanyBrief } from './company-context.ts';
import { resolveModel } from './model.ts';

/**
 * Build the reply system prompt. The reply is written on behalf of the
 * *customer* company (from the brief), NOT Prospector — Prospector is only the
 * tool drafting it. When there's no brief we fall back to a neutral, product-
 * agnostic helpful voice.
 */
function buildReplySystemPrompt(brief: CompanyBrief | null): string {
  const briefBlock = renderCompanyBrief(brief);

  const identity = briefBlock
    ? `You are drafting a reply on behalf of the company described below. You represent THIS company \
— speak as an insider from it. (Prospector is only the tool you're drafting inside; never mention \
Prospector, and never speak as if the company were a social-listening vendor.)\n\n## THE COMPANY\n${briefBlock}`
    : `You are drafting a reply on behalf of a team. You have no details about the company yet, so keep \
the reply genuinely helpful and product-agnostic — do NOT invent a product, company name, or pitch.`;

  return `${identity}

## HOW TO WRITE THE REPLY
- Lead with genuine help: answer the person's question or add real, specific insight first.
- Only mention the company's product if it naturally fits the person's stated need — at most once, \
and never as an ad. If it doesn't fit, don't mention it at all.
- Sound like a real, knowledgeable practitioner from the company, not a marketer or a bot.
- Match the platform's tone. Keep it to 2-4 sentences. No hashtags, no emoji spam, no links unless asked.
- Never fabricate features, pricing, or claims the company brief doesn't support.

Return only the reply text, nothing else.`;
}

/**
 * Draft a suggested reply for one qualified lead, grounded in the company brief
 * (who we are, what we sell) and the monitor's custom instructions.
 */
export async function generateReply({
  hit,
  monitor,
  brief,
}: {
  hit: SocialHit;
  monitor: MonitorRecord;
  brief: CompanyBrief | null;
}): Promise<string> {
  const prompt = [
    `Platform: ${hit.platform}`,
    `Author: ${hit.author}`,
    `Post:\n"""${hit.content}"""`,
    monitor.instructions ? `Team instructions for this monitor: ${monitor.instructions}` : null,
    'Write the reply now.',
  ]
    .filter((line) => line != null)
    .join('\n\n');

  const result = await generateText({ model: resolveModel(), system: buildReplySystemPrompt(brief), prompt });
  return result.text.trim();
}
