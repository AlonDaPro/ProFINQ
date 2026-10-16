import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '../../constants/errorCode.js';
import { HttpStatus } from '../../constants/httpStatus.js';
import { isDatabaseUnavailableError } from '../../db/pool.js';
import { DomainError, type DomainErrorCode } from '../../domain/errors.js';
import type { Logger } from '../../logger.js';
import { errorBody, type ApiErrorBody } from '../apiErrorBody.js';

interface HttpErrorResponse {
  /** Usually an HttpStatus; client errors raised by body-parser keep their own 4xx (e.g. 415). */
  status: number;
  body: ApiErrorBody;
}

/** `type` tags that express.json() (body-parser) sets on the errors it raises. */
enum BodyParserErrorType {
  ParseFailed = 'entity.parse.failed',
  TooLarge = 'entity.too.large',
}

const FIRST_SERVER_ERROR_STATUS: number = HttpStatus.InternalServerError;

// Exhaustive on purpose: a new domain error does not compile until it is given a status.
const DOMAIN_ERROR_STATUS: Readonly<Record<DomainErrorCode, HttpStatus>> = {
  [ErrorCode.ProfileNotFound]: HttpStatus.NotFound,
  [ErrorCode.ProfileAlreadyExists]: HttpStatus.Conflict,
};

const BODY_PARSER_ERRORS: ReadonlyMap<string, HttpErrorResponse> = new Map([
  [
    BodyParserErrorType.ParseFailed,
    { status: HttpStatus.BadRequest, body: errorBody(ErrorCode.MalformedJson, 'Request body is not valid JSON') },
  ],
  [
    BodyParserErrorType.TooLarge,
    { status: HttpStatus.PayloadTooLarge, body: errorBody(ErrorCode.PayloadTooLarge, 'Request body is too large') },
  ],
]);

function bodyParserError(error: unknown): HttpErrorResponse | undefined {
  if (!(error instanceof Error) || !('type' in error) || typeof error.type !== 'string') return undefined;
  const known = BODY_PARSER_ERRORS.get(error.type);
  if (known) return known;
  // Other body-parser rejections (unsupported charset or encoding, aborted upload) are
  // http-errors with `expose: true` and a 4xx status: the client's fault, not a 500.
  if ('expose' in error && error.expose === true && 'status' in error && typeof error.status === 'number') {
    return { status: error.status, body: errorBody(ErrorCode.InvalidRequest, error.message) };
  }
  return undefined;
}

function toHttpError(error: unknown): HttpErrorResponse | null {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    return {
      status: HttpStatus.BadRequest,
      body: errorBody(ErrorCode.ValidationFailed, 'Request validation failed', details),
    };
  }
  if (error instanceof DomainError) {
    return {
      status: DOMAIN_ERROR_STATUS[error.code],
      body: errorBody(error.code, error.message),
    };
  }
  const parserError = bodyParserError(error);
  if (parserError) {
    return parserError;
  }
  if (isDatabaseUnavailableError(error)) {
    return {
      status: HttpStatus.ServiceUnavailable,
      body: errorBody(ErrorCode.ServiceUnavailable, 'Storage is temporarily unavailable'),
    };
  }
  return null;
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const known = toHttpError(error);
    if (known) {
      if (known.status >= FIRST_SERVER_ERROR_STATUS) {
        logger.error(`${req.method} ${req.originalUrl} failed`, error);
      }
      res.status(known.status).json(known.body);
      return;
    }
    // Unknown errors may contain SQL or stack details, so they are logged but never echoed.
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
    res.status(HttpStatus.InternalServerError).json(errorBody(ErrorCode.InternalError, 'An unexpected error occurred'));
  };
}
