import { z } from 'zod';

export const PlatformSchema = z.enum(['reddit', 'linkedin', 'x']).describe('Platform to monitor. Example: "reddit"');
export type Platform = z.infer<typeof PlatformSchema>;

export const FrequencySchema = z
  .enum(['hourly', 'every_6_hours', 'daily'])
  .describe('How often the monitor scans for new posts. Example: "daily"');
export type Frequency = z.infer<typeof FrequencySchema>;

export const MonitorInputSchema = z.object({
  name: z.string().min(1).describe('Short human-readable monitor name. Example: "AI dev tools leads"'),
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .max(10)
    .describe('Keywords or phrases to watch for, up to 10. Example: ["slack app", "workflow automation"]'),
  platforms: z.array(PlatformSchema).min(1).describe('Platforms to scan. Example: ["reddit", "x"]'),
  frequency: FrequencySchema,
  channelId: z.string().describe('Slack channel ID to post leads into. Example: "C0123456789"'),
  instructions: z
    .string()
    .nullable()
    .describe('Optional custom filter instructions. Example: "Only posts from founders, ignore job listings"'),
});
export type MonitorInput = z.infer<typeof MonitorInputSchema>;

export const MonitorSchema = MonitorInputSchema.extend({
  id: z.string().describe('Unique monitor ID. Example: "mon_1"'),
  createdBy: z.string().describe('Slack user ID of the creator. Example: "U0123456789"'),
  createdAt: z.string().describe('ISO timestamp of creation'),
});
export type Monitor = z.infer<typeof MonitorSchema>;

export const LeadSchema = z.object({
  id: z.string().describe('Unique lead ID. Example: "lead_1"'),
  monitorId: z.string().describe('Monitor that surfaced this lead'),
  platform: PlatformSchema,
  author: z.string().describe('Post author handle. Example: "u/startup_sam"'),
  url: z.string().describe('Link to the original post'),
  content: z.string().describe('The post text that matched the monitor'),
  matchedKeywords: z.array(z.string()).describe('Which monitor keywords matched'),
  foundAt: z.string().describe('ISO timestamp when the lead was found'),
});
export type Lead = z.infer<typeof LeadSchema>;
