import { type ToolSet, tool } from 'ai';
import { z } from 'zod';

import { type CompanyBriefInput, getCompanyBrief, upsertCompanyBrief } from '../../db/company-brief.ts';
import type { SlackOrgContext } from '../../db/monitors.ts';
import { type CompanyBrief, CompanyBriefSchema } from '../../schemas/db.ts';

const MISSING_WORKSPACE_MESSAGE =
  'Could not determine the Slack workspace for this conversation, so company brief tools are unavailable.';

function formatBrief(brief: CompanyBrief): string {
  return [
    `*Company brief*${brief.onboarded ? '' : ' — onboarding incomplete'}`,
    brief.companyName ? `Name: ${brief.companyName}` : null,
    brief.websiteUrl ? `Website: ${brief.websiteUrl}` : null,
    brief.description ? `What they do: ${brief.description}` : null,
    brief.products ? `Products / features: ${brief.products}` : null,
    brief.idealCustomer ? `Ideal customer: ${brief.idealCustomer}` : null,
    brief.competitors ? `Competitors: ${brief.competitors}` : null,
    brief.notes ? `Other context: ${brief.notes}` : null,
  ]
    .filter((line) => line != null)
    .join('\n');
}

/** Shared input schema for writing a brief — every field optional (partial upsert). */
const briefInputSchema = CompanyBriefSchema.pick({
  companyName: true,
  websiteUrl: true,
  description: true,
  products: true,
  idealCustomer: true,
  competitors: true,
  notes: true,
  onboarded: true,
});

/**
 * Build the company-brief tools bound to the request's Slack org context. These
 * let the agent read and write the customer company's onboarding brief — the
 * ground truth used to filter leads and draft replies. `context` is null when
 * the workspace can't be resolved; the tools then respond with an explanation.
 *
 * `briefExists` controls which write tool is exposed: `set_company_brief`
 * (initial creation during onboarding) is offered ONLY when no brief exists
 * yet, while `edit_company_brief` is always available for later updates.
 */
export function createCompanyTools(context: SlackOrgContext | null, { briefExists }: { briefExists: boolean }) {
  const get_company_brief = tool({
    description:
      "Read the customer company's onboarding brief (who they are, what they do, products, ideal customer, " +
      'competitors). Use this to check what you already know before asking onboarding questions or editing the brief.',
    inputSchema: z.object({}),
    execute: async () => {
      if (context == null) return MISSING_WORKSPACE_MESSAGE;
      const brief = await getCompanyBrief({ slackInstallId: context.slackInstallId });
      if (brief == null) {
        return 'No company brief yet. This workspace has not been onboarded — collect the company details and call `set_company_brief`.';
      }
      return formatBrief(brief);
    },
  });

  async function writeBrief(input: CompanyBriefInput): Promise<string> {
    if (context == null) return MISSING_WORKSPACE_MESSAGE;

    if (Object.values(input).every((value) => value === undefined)) {
      return 'No brief fields provided. Pass at least one field (companyName, websiteUrl, description, products, idealCustomer, competitors, notes, or onboarded).';
    }

    const brief = await upsertCompanyBrief({ slackInstallId: context.slackInstallId, input });
    if (brief == null) return MISSING_WORKSPACE_MESSAGE;
    return `Company brief saved:\n${formatBrief(brief)}`;
  }

  const set_company_brief = tool({
    description:
      "Create the customer company's brief for the first time during onboarding. Call this as you gather answers " +
      '(incrementally — only pass the fields you learned this turn). Set `onboarded` to true once you have at least ' +
      'a website or a clear description plus a sense of the products and ideal customer. This brief is what ' +
      "Prospector uses to filter leads and draft replies, so capture it accurately in the customer's own terms — " +
      'never describe Prospector itself.',
    inputSchema: briefInputSchema,
    execute: writeBrief,
  });

  const edit_company_brief = tool({
    description:
      "Update the customer company's existing brief when the user corrects or adds detail (new products, changed " +
      'positioning, more competitors, tone, etc.). Only pass the fields being changed. Use `get_company_brief` ' +
      'first if you need to see the current values.',
    inputSchema: briefInputSchema,
    execute: writeBrief,
  });

  // Once a brief exists, drop `set_company_brief` and only expose the editor.
  const tools: ToolSet = { get_company_brief, edit_company_brief };
  if (!briefExists) tools.set_company_brief = set_company_brief;
  return tools;
}
