export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
}

/**
 * Logs an error's name, code, message and stack (and those of its causes), nothing else. A Postgres
 * error's `detail` can echo the whole failing row (emails, phone numbers), so it is never logged.
 */
/** The `code` Node and Postgres errors carry (ECONNREFUSED, 23505, ...), if any. */
export function errorCodeOf(error: Error): string | undefined {
  return 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

export function describeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { value: String(error) };
  const code = errorCodeOf(error);
  return {
    name: error.name,
    message: error.message,
    ...(code === undefined ? {} : { code }),
    ...(error.stack === undefined ? {} : { stack: error.stack }),
    ...(error.cause === undefined ? {} : { cause: describeError(error.cause) }),
  };
}

export const consoleLogger: Logger = {
  info: (message, context) => {
    if (context) console.info(message, context);
    else console.info(message);
  },
  error: (message, error) => {
    if (error === undefined) console.error(message);
    else console.error(message, describeError(error));
  },
};
