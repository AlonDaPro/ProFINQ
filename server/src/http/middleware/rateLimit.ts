import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS } from '../../constants/api.js';
import { ErrorCode } from '../../constants/errorCode.js';
import { HttpStatus } from '../../constants/httpStatus.js';
import { errorBody } from '../apiErrorBody.js';

export interface RateLimits {
  readsPerMinute: number;
  writesPerMinute: number;
}

const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Per-IP limits, stricter for writes. The default in-memory store is per process; with several
 * instances, swap in a shared store (e.g. Redis) so the limit holds across the fleet.
 */
export function createRateLimiters({ readsPerMinute, writesPerMinute }: RateLimits): RequestHandler[] {
  const limiter = (limit: number, skip: (method: string) => boolean) =>
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => skip(req.method),
      handler: (_req, res) => {
        res
          .status(HttpStatus.TooManyRequests)
          .json(errorBody(ErrorCode.TooManyRequests, 'Too many requests. Try again in a minute.'));
      },
    });

  return [
    limiter(readsPerMinute, (method) => !READ_METHODS.has(method)),
    limiter(writesPerMinute, (method) => READ_METHODS.has(method)),
  ];
}
