import type { HttpStatus } from '@/constants/http';

/** One field-level problem from the server's error envelope, e.g. `{ path: 'body.email', message }`. */
interface ApiErrorDetail {
  path: string;
  message: string;
}

/** A failed request. `status` is set when the server answered, and missing for network errors and timeouts. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details: readonly ApiErrorDetail[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
  }
}

const FALLBACK_ERROR_MESSAGE = 'Something went wrong';

export function hasHttpStatus(error: unknown, status: HttpStatus): boolean {
  return error instanceof ApiError && error.status === status;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : FALLBACK_ERROR_MESSAGE;
}
