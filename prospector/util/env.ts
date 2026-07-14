import { config } from 'dotenv';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_REDIRECT_URI: z.url(),
  SLACK_STATE_SECRET: z.string().min(1).default('prospector-agent'),
  PORT: z.coerce.number().default(3000),
  // Logging: level controls verbosity; the logger auto-switches to pretty
  // output outside production (NODE_ENV !== 'production').
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  PROSPECTOR_MODEL: z.string().optional(),
  BRIDGLY_API_KEY: z.string().min(1),

  // Composio-powered social integrations (Reddit / LinkedIn / X).
  COMPOSIO_API_KEY: z.string().min(1),
  COMPOSIO_AUTH_CONFIG_REDDIT: z.string().min(1),
  COMPOSIO_AUTH_CONFIG_LINKEDIN: z.string().min(1),
  COMPOSIO_AUTH_CONFIG_TWITTER: z.string().min(1),
  // Public origin Composio redirects back to after OAuth. Defaults to the
  // Slack redirect URI's origin (same public host the app is served on).
  PUBLIC_BASE_URL: z.url().optional(),
});
export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  config();
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    console.error(`Missing or invalid environment variables: ${missing}. See .env.sample.`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = parseEnv();
