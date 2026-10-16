import type { ZodError, ZodType, ZodTypeDef } from 'zod';

/** Which part of the request a validation problem is in; prefixed to every error path. */
export enum RequestPart {
  Params = 'params',
  Query = 'query',
  Body = 'body',
}

export class RequestValidationError extends Error {
  constructor(
    readonly part: RequestPart,
    readonly zodError: ZodError,
  ) {
    super(`Invalid request ${part}`);
    this.name = 'RequestValidationError';
  }
}

export function parseRequest<T>(schema: ZodType<T, ZodTypeDef, unknown>, value: unknown, part: RequestPart): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new RequestValidationError(part, result.error);
  return result.data;
}
