export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
}

export const consoleLogger: Logger = {
  info: (message, context) => {
    console.info(message, context ?? '');
  },
  error: (message, error) => {
    console.error(message, error ?? '');
  },
};
