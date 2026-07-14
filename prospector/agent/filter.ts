import { generateObject } from 'ai';
import { z } from 'zod';

import type { SocialHit } from '../bridgly/index.ts';
import type { CompanyBrief, MonitorRecord } from '../schemas/db.ts';
import { renderCompanyBrief } from './company-context.ts';
import { resolveModel } from './model.ts';

/** A hit paired with the monitor keywords that surfaced it. */
type MatchedHit = SocialHit & { matchedKeywords: string[] };

/** A single qualification decision for one candidate post, keyed by its index. */
export interface FilterDecision {
  index: number;
  qualified: boolean;
  reason: string;
}

const FilterResultSchema = z.object({
  decisions: z
    .array(
      z.object({
        index: z.number().int().describe('The index of the post being judged, echoed back from the input'),
        qualified: z
          .boolean()
          .describe('true only if this post is a genuine, actionable lead for the company; otherwise false'),
        reason: z.string().describe('One short sentence justifying the decision'),
      }),
    )
    .describe('Exactly one decision per candidate post'),
});

function buildFilterSystemPrompt(brief: CompanyBrief | null, monitor: MonitorRecord): string {
  const briefBlock = renderCompanyBrief(brief);

  const identity = briefBlock
    ? `You are the lead-qualification filter for the company described below. You work FOR this \
company — it is the customer. (Prospector is only the tool running you; never treat Prospector as \
the company.)\n\n## THE COMPANY\n${briefBlock}`
    : `You are a lead-qualification filter. The company you work for has NOT completed onboarding, so \
you have no description of what they do. Without that context you must be strict: only pass posts \
where someone is very clearly expressing a buying need or asking for a recommendation that plausibly \
matches the monitor's keywords. When in doubt, reject.`;

  return `${identity}

## MONITOR
Name: ${monitor.name}
Keywords: ${monitor.keywords.join(', ')}
${monitor.instructions ? `Filter instructions from the team: ${monitor.instructions}` : 'No extra filter instructions.'}

## YOUR JOB
You are given a batch of social posts that merely CONTAINED a monitor keyword. Keyword matches are \
noisy — most are not real leads. Decide, for each post, whether it is a genuine lead worth a human's \
time and a reply.

## QUALIFY (qualified = true) only when the post shows real intent, such as:
- Someone asking for a recommendation, tool, or solution the company actually provides
- Someone talking about their own company or competitor company when the keywords are attached for the same
- Someone describing a pain point or problem the company solves
- Someone comparing options or evaluating vendors in the company's space
- Someone expressing frustration with a competitor or the status quo

## REJECT (qualified = false) for noise, such as:
- The company (or a competitor) promoting themselves; news, announcements, or press
- Jokes, memes, or off-topic mentions
- Job posts, hiring, "we're hiring", résumés, or people looking for work
- Generic keyword collisions where the topic is unrelated to what the company does
- Posts where the keyword appears but there is no need the company could address

Be strict. A weak or tangential match is a REJECT. It is far better to surface three great leads \
than thirty mediocre ones. Return exactly one decision per post, echoing back its index.`;
}

function buildFilterPrompt(hits: MatchedHit[]): string {
  const posts = hits
    .map((hit, index) =>
      [
        `--- Post ${index} ---`,
        `Platform: ${hit.platform}`,
        `Author: ${hit.author}`,
        `Matched keywords: ${hit.matchedKeywords.join(', ')}`,
        `Content: ${hit.content.slice(0, 1200)}`,
      ].join('\n'),
    )
    .join('\n\n');

  return `Judge each of the following ${hits.length} post(s). Return one decision per post.\n\n${posts}`;
}

/**
 * Qualify a batch of keyword hits against the company brief + monitor rules,
 * returning only the hits judged to be genuine leads. The LLM decides per post;
 * on any error we fail safe by returning nothing (a bad filter run should never
 * flood the channel with unfiltered noise).
 */
export async function filterHits({
  hits,
  monitor,
  brief,
}: {
  hits: MatchedHit[];
  monitor: MonitorRecord;
  brief: CompanyBrief | null;
}): Promise<{ qualified: MatchedHit[]; decisions: FilterDecision[] }> {
  if (hits.length === 0) return { qualified: [], decisions: [] };

  const { object } = await generateObject({
    model: resolveModel(),
    schema: FilterResultSchema,
    system: buildFilterSystemPrompt(brief, monitor),
    prompt: buildFilterPrompt(hits),
  });

  const decisions = object.decisions;
  const qualified = hits.filter((_, index) => decisions.find((d) => d.index === index)?.qualified === true);
  return { qualified, decisions };
}
