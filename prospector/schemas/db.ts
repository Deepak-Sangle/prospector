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
  createdById: z.string().describe('User.id of the creator (not the raw Slack user ID)'),
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
  status: MonitorResultStatusSchema,
  slackMessageTs: z.string().nullable().describe('ts of the lead card posted to the monitor channel'),
  foundAt: z.date(),
});
export type MonitorResult = z.infer<typeof MonitorResultSchema>;

export const MonitorReplySchema = z.object({
  id: z.string(),
  monitorResultId: z.string(),
  content: z.string(),
  createdAt: z.date(),
});
export type MonitorReply = z.infer<typeof MonitorReplySchema>;
