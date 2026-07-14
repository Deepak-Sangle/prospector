import type { CompanyBrief } from '../schemas/db.ts';
import { prisma } from './client.ts';

/** Fields of a company brief that onboarding / edits can set. All optional (partial upsert). */
export type CompanyBriefInput = Partial<CompanyBrief>;

/** Read the company brief for an organization (resolved via install key), or null if none yet. */
export async function getCompanyBrief({ slackInstallId }: { slackInstallId: string }): Promise<CompanyBrief | null> {
  return prisma.companyBrief.findFirst({
    where: { organization: { slackInstallId } },
  });
}

/**
 * Create or update the org's single company brief. Only the provided fields are
 * changed on update, so onboarding can fill it in incrementally across turns.
 * Returns the persisted brief, or null when the organization can't be resolved.
 */
export async function upsertCompanyBrief({
  slackInstallId,
  input,
}: {
  slackInstallId: string;
  input: CompanyBriefInput;
}): Promise<CompanyBrief | null> {
  const organization = await prisma.organization.findUnique({
    where: { slackInstallId },
    select: { id: true },
  });
  if (organization == null) return null;

  // Drop undefined keys so a partial update never clobbers existing fields.
  const data = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as CompanyBriefInput;

  return prisma.companyBrief.upsert({
    where: { organizationId: organization.id },
    create: { organizationId: organization.id, ...data },
    update: data,
  });
}
