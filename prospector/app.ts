import { App, LogLevel } from '@slack/bolt';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { startScheduler } from './cron/scheduler.ts';
import { createDbInstallationStore } from './db/installation-store.ts';
import { createOAuthCallbackRoute } from './integrations/callback-route.ts';
import { registerListeners } from './listeners/index.ts';
import { env } from './util/env.ts';
import { createBoltLogger, createLogger } from './util/logger.ts';

const log = createLogger('app');

const ManifestScopesSchema = z.object({
  oauth_config: z.object({ scopes: z.object({ bot: z.array(z.string()) }) }),
});

const manifest = ManifestScopesSchema.parse(JSON.parse(readFileSync('manifest.json', 'utf-8')));
const botScopes = manifest.oauth_config.scopes.bot;

const app = new App({
  logger: createBoltLogger(),
  logLevel: env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace' ? LogLevel.DEBUG : LogLevel.INFO,
  signingSecret: env.SLACK_SIGNING_SECRET,
  ignoreSelf: false,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  scopes: botScopes,
  redirectUri: env.SLACK_REDIRECT_URI,
  installationStore: createDbInstallationStore(),
  customRoutes: [createOAuthCallbackRoute()],
  installerOptions: {
    stateVerification: true,
    redirectUriPath: new URL(env.SLACK_REDIRECT_URI).pathname,
    // Serve the /slack/install initiation page (without this Bolt skips the route).
    directInstall: true,
  },
});

registerListeners(app);

async function main(): Promise<void> {
  await app.start(env.PORT);
  await startScheduler();
  log.info(`⛏️ Prospector is running on port ${env.PORT}`);
  log.info(`Install Prospector: ${new URL(env.SLACK_REDIRECT_URI).origin}/slack/install`);
}

main().catch((e) => {
  log.error({ err: e }, 'Failed to start Prospector');
  process.exit(1);
});
