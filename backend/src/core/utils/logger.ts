import { env } from '../../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

const currentLevelIndex = LEVELS.indexOf(env.LOG_LEVEL);

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  if (LEVELS.indexOf(level) > currentLevelIndex) {
    return;
  }

  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (meta) {
    // eslint-disable-next-line no-console
    (console as any)[level](base, meta);
  } else {
    // eslint-disable-next-line no-console
    (console as any)[level](base);
  }
};

export const logger = {
  error: (message: string, meta?: unknown) => log('error', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta)
};

