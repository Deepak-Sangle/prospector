import 'dotenv/config';

import { createLogger } from '../util/logger.ts';
import { runMonitor } from './workflow.ts';

const log = createLogger('cron');

/**
 * CLI entry point Fly.io runs on a schedule:  `node cron/run-monitor.ts <monitorId>`
 * The monitor ID is passed as the first argument by the per-monitor cron trigger.
 */
async function main(): Promise<void> {
  const monitorId = process.argv[2];
  if (!monitorId) {
    log.error('Usage: node cron/run-monitor.ts <monitorId>');
    process.exit(1);
  }

  await runMonitor(monitorId);
  process.exit(0);
}

main().catch((err) => {
  log.error({ err }, 'run failed');
  process.exit(1);
});
