export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
}

/**
 * Logs only an error's name, code and message (and those of its causes). A Postgres error's
 * `detail` can echo the whole failing row (emails, phone numbers), so it is never logged.
 */
export function describeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { value: String(error) };
  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  return {
    name: error.name,
    message: error.message,
    ...(code === undefined ? {} : { code }),
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
