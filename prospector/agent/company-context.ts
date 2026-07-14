import type { CompanyBrief } from '../schemas/db.ts';

/** True when the brief exists and has enough substance to filter + reply well. */
export function isBriefUsable(brief: CompanyBrief | null): boolean {
  if (brief == null) return false;
  if (brief.onboarded) return true;
  // Even without the onboarded flag, a description alone is enough to be useful.
  return brief.description != null && brief.description.trim().length > 0;
}

/**
 * Render a company brief as a labelled prompt block describing the *customer*
 * company (never Prospector, the vendor). Returns null when there's nothing
 * worth including. Shared by the main agent, the lead filter, and reply drafting
 * so every surface reasons about the same company facts.
 */
export function renderCompanyBrief(brief: CompanyBrief | null): string | null {
  if (brief == null) return null;
  const lines = [
    brief.companyName ? `Company name: ${brief.companyName}` : null,
    brief.websiteUrl ? `Website: ${brief.websiteUrl}` : null,
    brief.description ? `What they do: ${brief.description}` : null,
    brief.products ? `Products / features: ${brief.products}` : null,
    brief.idealCustomer ? `Ideal customer: ${brief.idealCustomer}` : null,
    brief.competitors ? `Competitors: ${brief.competitors}` : null,
    brief.notes ? `Other context: ${brief.notes}` : null,
  ].filter((line): line is string => line != null);

  if (lines.length === 0) return null;
  return lines.join('\n');
}
