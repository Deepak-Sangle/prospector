import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_REDIRECT_URI: z.url(),
  SLACK_STATE_SECRET: z.string().min(1).default('prospector-agent'),
  PORT: z.coerce.number().default(3000),
  PROSPECTOR_MODEL: z.string().optional(),
});
export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    console.error(`Missing or invalid environment variables: ${missing}. See .env.sample.`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = parseEnv();
