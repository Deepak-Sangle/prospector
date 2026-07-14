import type { Frequency } from '../schemas/monitor.ts';

/**
 * Build a per-monitor cron expression (5-field, UTC) derived from when the
 * monitor was created. Anchoring on the creation minute (and hour) spreads
 * load out: two users who both pick "hourly" run at different minutes past the
 * hour, so scans aren't all bunched on the top of the hour.
 */
export function buildMonitorCron(frequency: Frequency, createdAt: Date): string {
  const minute = createdAt.getUTCMinutes();
  const hour = createdAt.getUTCHours();

  if (frequency === 'hourly') {
    return `${minute} * * * *`;
  }
  if (frequency === 'every_6_hours') {
    const base = hour % 6;
    const hours = [base, base + 6, base + 12, base + 18].join(',');
    return `${minute} ${hours} * * *`;
  }
  return `${minute} ${hour} * * *`;
}
