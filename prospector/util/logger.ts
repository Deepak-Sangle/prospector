import { type Logger as BoltLogger, LogLevel as BoltLogLevel } from '@slack/bolt';
import { pino } from 'pino';
import pretty from 'pino-pretty';

/**
 * Central logger for Prospector, built on pino (the same logging core Fastify
 * uses). In development we pipe through pino-pretty for readable, colorized,
 * single-line output; in production we emit newline-delimited JSON so log
 * aggregators can parse it.
 *
 * Use `log` directly for app-wide messages, or `createLogger('scope')` to get a
 * child logger tagged with a module name so you can tell where a line came from.
 */
const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

export const log = isProduction
  ? pino({ level })
  : pino(
      { level },
      pretty({
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        // `module` is rendered inline via messageFormat, so drop it (and noise)
        // from the trailing structured object.
        ignore: 'pid,hostname,module',
        messageFormat: '[{module}] {msg}',
        singleLine: true,
      }),
    );

/** Create a child logger tagged with a module name (shown as a prefix per line). */
export function createLogger(module: string) {
  return log.child({ module });
}

const BOLT_LEVELS: Record<BoltLogLevel, string> = {
  [BoltLogLevel.DEBUG]: 'debug',
  [BoltLogLevel.INFO]: 'info',
  [BoltLogLevel.WARN]: 'warn',
  [BoltLogLevel.ERROR]: 'error',
};

/**
 * Adapt our pino logger to the interface Slack Bolt expects, so Bolt's internal
 * logging flows through the same formatter as everything else. Bolt calls its
 * logger with variadic args (mostly strings); we join them into one message.
 */
export function createBoltLogger(name = 'slack'): BoltLogger {
  let child = log.child({ module: name });
  let currentLevel = BoltLogLevel.INFO;

  const toMessage = (msgs: unknown[]): string => msgs.map((m) => (typeof m === 'string' ? m : String(m))).join(' ');

  return {
    debug: (...msgs: unknown[]) => child.debug(toMessage(msgs)),
    info: (...msgs: unknown[]) => child.info(toMessage(msgs)),
    warn: (...msgs: unknown[]) => child.warn(toMessage(msgs)),
    error: (...msgs: unknown[]) => child.error(toMessage(msgs)),
    setLevel: (newLevel: BoltLogLevel) => {
      currentLevel = newLevel;
      child.level = BOLT_LEVELS[newLevel] ?? 'info';
    },
    getLevel: () => currentLevel,
    setName: (newName: string) => {
      child = log.child({ module: newName });
    },
  };
}
