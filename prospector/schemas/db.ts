import { z } from 'zod';

import { MonitorInputSchema, PlatformSchema } from './monitor.ts';

// Zod mirrors of the Prisma models (prisma/schema.prisma). App code uses these
// types, never the generated Prisma types — keep both in sync when the schema
// changes.

export const OrganizationSchema = z.object({
  id: z.string(),
  slackInstallId: z.string().describe('Stable install key: team ID, or enterprise ID for org-wide installs'),
  slackTeamId: z.string().nullable().describe('Slack team ID (null for org-wide installs). Example: "T0123456789"'),
  slackEnterpriseId: z.string().nullable(),
  isEnterpriseInstall: z.boolean(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// The customer company Prospector prospects *for*. One per organization,
// captured during onboarding. Prospector is only the vendor — this describes
// the customer's own business, which the agent uses to qualify leads and draft
// replies in the customer's voice.
export const CompanyBriefSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  companyName: z.string().nullable().describe('Company name as the customer refers to themselves'),
  websiteUrl: z.string().nullable().describe('Primary marketing/product website'),
  description: z.string().nullable().describe('What the company does — core value proposition'),
  products: z.string().nullable().describe('Products / features the company offers'),
  idealCustomer: z.string().nullable().describe('Ideal customer: roles, company size, industry, buying signals'),
  competitors: z.string().nullable().describe('Known competitors'),
  notes: z.string().nullable().describe('Any other custom context for the agent'),
  onboarded: z.boolean().describe('Whether onboarding captured enough info to filter + reply well'),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;

export const UserSchema = z.object({
  id: z.string(),
  slackUserId: z.string().describe('Slack user ID. Example: "U0123456789"'),
  organizationId: z.string(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const SlackInstallationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slackInstallId: z.string().describe('Stable install key: team ID, or enterprise ID for org-wide installs'),
  slackTeamId: z.string().nullable().describe('Slack team ID (null for org-wide installs)'),
  slackEnterpriseId: z.string().nullable(),
  isEnterpriseInstall: z.boolean(),
  installerSlackUserId: z.string(),
  installation: z.record(z.string(), z.unknown()).describe('Raw Bolt OAuth installation payload'),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SlackInstallation = z.infer<typeof SlackInstallationSchema>;

export const MonitorRecordSchema = MonitorInputSchema.extend({
  id: z.string(),
  organizationId: z.string(),
  isActive: z.boolean(),
  lastRunAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MonitorRecord = z.infer<typeof MonitorRecordSchema>;

export const MonitorResultStatusSchema = z.enum(['new', 'dismissed']);
export type MonitorResultStatus = z.infer<typeof MonitorResultStatusSchema>;

export const MonitorResultSchema = z.object({
  id: z.string(),
  monitorId: z.string(),
  platform: PlatformSchema,
  author: z.string().describe('Post author handle. Example: "u/startup_sam"'),
  url: z.string().describe('Link to the original post — unique per monitor (dedupe key)'),
  content: z.string(),
  matchedKeywords: z.array(z.string()),
  externalId: z
    .string()
    .nullable()
    .describe('Native post id for replying via Composio (Reddit fullname, X tweet id, LinkedIn URN)'),
  status: MonitorResultStatusSchema,
  slackMessageTs: z.string().nullable().describe('ts of the lead card posted to the monitor channel'),
  foundAt: z.date(),
});
export type MonitorResult = z.infer<typeof MonitorResultSchema>;

export const ConnectedAccountStatusSchema = z.enum(['active', 'expired', 'inactive']);
export type ConnectedAccountStatus = z.infer<typeof ConnectedAccountStatusSchema>;

export const ConnectedAccountSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slackUserId: z.string().describe('Slack user who authorized this account. Example: "U0123456789"'),
  composioUserId: z.string().describe('Deterministic external identity handed to Composio'),
  platform: PlatformSchema,
  composioAccountId: z.string().describe("Composio's connected-account id"),
  status: ConnectedAccountStatusSchema,
  scopes: z.array(z.string()).describe('OAuth scopes granted by the provider'),
  uniqueIdentifier: z
    .string()
    .nullable()
    .describe('Human-friendly account identity (reddit username, linkedin urn, x handle)'),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

export const MonitorReplySchema = z.object({
  id: z.string(),
  monitorResultId: z.string(),
  content: z.string(),
  createdAt: z.date(),
});
export type MonitorReply = z.infer<typeof MonitorReplySchema>;
