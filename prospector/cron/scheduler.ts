import { Cron } from 'croner';
import { listActiveMonitors } from '../db/monitors.ts';
import type { MonitorRecord } from '../schemas/db.ts';
import { createLogger } from '../util/logger.ts';
import { safe } from '../util/result.ts';
import { buildMonitorCron } from './schedule.ts';
import { runMonitor } from './workflow.ts';

const log = createLogger('scheduler');

// In-memory registry of running cron jobs, keyed by monitor ID. This lives in
// the process, so it's rebuilt from the DB on every boot (see startScheduler).
const jobs = new Map<string, Cron>();

/**
 * Register (or re-register) a monitor's scheduled scan in this process. Returns
 * the cron expression so callers can show the user when it will run, or null if
 * scheduling failed (e.g. an invalid expression) — never throws.
 */
export function registerMonitor(monitor: MonitorRecord): string | null {
  unregisterMonitor(monitor.id);
  const cron = buildMonitorCron(monitor.frequency, monitor.createdAt);
  try {
    const job = new Cron(cron, { name: monitor.id, timezone: 'UTC' }, () => {
      runMonitor(monitor.id).catch((err) => log.error({ err, monitorId: monitor.id }, 'scheduled run failed'));
    });
    jobs.set(monitor.id, job);
    return cron;
  } catch (err) {
    log.error({ err, monitorId: monitor.id, cron }, 'failed to schedule monitor');
    return null;
  }
}

/** Stop and forget a monitor's scheduled scan. Never throws. */
export function unregisterMonitor(monitorId: string): void {
  try {
    jobs.get(monitorId)?.stop();
  } catch (err) {
    log.error({ err, monitorId }, 'failed to stop monitor job');
  }
  jobs.delete(monitorId);
}

/** Load all active monitors from the DB and schedule them. Call once on boot. */
export async function startScheduler(): Promise<void> {
  const loaded = await safe(() => listActiveMonitors());
  if (!loaded.success) {
    log.error({ error: loaded.error }, 'failed to load monitors, scheduler idle');
    return;
  }
  let registered = 0;
  for (const monitor of loaded.data) {
    if (registerMonitor(monitor) != null) registered += 1;
  }
  log.info({ count: registered }, `registered ${registered} monitor(s)`);
}
