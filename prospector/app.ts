import { App, LogLevel } from '@slack/bolt';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createDbInstallationStore } from './db/installation-store.ts';
import { registerListeners } from './listeners/index.ts';
import { env } from './util/env.ts';

const ManifestScopesSchema = z.object({
  oauth_config: z.object({ scopes: z.object({ bot: z.array(z.string()) }) }),
});

const manifest = ManifestScopesSchema.parse(JSON.parse(readFileSync('manifest.json', 'utf-8')));
const botScopes = manifest.oauth_config.scopes.bot;

const app = new App({
  logLevel: LogLevel.DEBUG,
  signingSecret: env.SLACK_SIGNING_SECRET,
  ignoreSelf: false,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  scopes: botScopes,
  redirectUri: env.SLACK_REDIRECT_URI,
  installationStore: createDbInstallationStore(),
  installerOptions: {
    stateVerification: true,
    redirectUriPath: new URL(env.SLACK_REDIRECT_URI).pathname,
  },
});

registerListeners(app);

async function main(): Promise<void> {
  await app.start(env.PORT);
  app.logger.info(`⛏️ Prospector is running on port ${env.PORT}!`);
  app.logger.info(`Install Prospector: ${new URL(env.SLACK_REDIRECT_URI).origin}/slack/install`);
}

main().catch((e) => {
  app.logger.error(`Failed to start Prospector: ${e}`);
  process.exit(1);
});
