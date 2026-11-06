/*
 * Minimal structured logger.
 *
 * Development: human-readable "[level] message ...".
 * Production:  one JSON object per line, ready for log shipping.
 * Tests:       errors only, so test output stays readable.
 *
 * Swap for pino/winston later if needed — call sites stay the same.
 */

type Level = 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: Level, args: unknown[]) {
  if (isTest && level !== 'error') return;

  const sink =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (isProduction) {
    const [message, ...rest] = args;
    sink(
      JSON.stringify({
        level,
        time: new Date().toISOString(),
        message: typeof message === 'string' ? message : serialize(message),
        ...(rest.length > 0 ? { context: rest.map(serialize) } : {}),
      }),
    );
    return;
  }

  sink(`[${level}]`, ...args);
}

export const logger = {
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
};
