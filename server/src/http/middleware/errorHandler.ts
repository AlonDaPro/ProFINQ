import type { ErrorRequestHandler } from 'express';
import { ErrorCode } from '../../constants/errorCode.js';
import { HttpStatus } from '../../constants/httpStatus.js';
import { isDatabaseUnavailableError } from '../../db/pool.js';
import { DomainError, type DomainErrorCode } from '../../domain/errors.js';
import type { Logger } from '../../logger.js';
import { errorBody, type ApiErrorBody } from '../apiErrorBody.js';
import { RequestValidationError } from '../requestValidation.js';

interface HttpErrorResponse {
  status: HttpStatus;
  body: ApiErrorBody;
}

/** `type` tags that express.json() (body-parser) sets on the errors it raises. */
enum BodyParserErrorType {
  ParseFailed = 'entity.parse.failed',
  TooLarge = 'entity.too.large',
  UnsupportedCharset = 'charset.unsupported',
  UnsupportedEncoding = 'encoding.unsupported',
}

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
  [
    BodyParserErrorType.UnsupportedCharset,
    {
      status: HttpStatus.UnsupportedMediaType,
      body: errorBody(ErrorCode.InvalidRequest, 'Request body charset is not supported'),
    },
  ],
  [
    BodyParserErrorType.UnsupportedEncoding,
    {
      status: HttpStatus.UnsupportedMediaType,
      body: errorBody(ErrorCode.InvalidRequest, 'Request body encoding is not supported'),
    },
  ],
]);

function bodyParserError(error: unknown): HttpErrorResponse | undefined {
  if (!(error instanceof Error) || !('type' in error) || typeof error.type !== 'string') return undefined;
  const known = BODY_PARSER_ERRORS.get(error.type);
  if (known) return known;
  // Any other body-parser rejection (e.g. an aborted upload) is the client's fault, not a 500.
  const isClientError = 'expose' in error && error.expose === true;
  return isClientError
    ? { status: HttpStatus.BadRequest, body: errorBody(ErrorCode.InvalidRequest, error.message) }
    : undefined;
}

function toHttpError(error: unknown): HttpErrorResponse | undefined {
  if (error instanceof RequestValidationError) {
    const details = error.zodError.issues.map((issue) => ({
      path: [error.part, ...issue.path].join('.'),
      message: issue.message,
    }));
    return {
      status: HttpStatus.BadRequest,
      body: errorBody(ErrorCode.ValidationFailed, 'Request validation failed', details),
    };
  }
  if (error instanceof DomainError) {
    return { status: DOMAIN_ERROR_STATUS[error.code], body: errorBody(error.code, error.message) };
  }
  const parserError = bodyParserError(error);
  if (parserError) return parserError;
  if (isDatabaseUnavailableError(error)) {
    return {
      status: HttpStatus.ServiceUnavailable,
      body: errorBody(ErrorCode.ServiceUnavailable, 'Storage is temporarily unavailable'),
    };
  }
  return undefined;
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const known = toHttpError(error);
    if (known) {
      if (known.status >= HttpStatus.InternalServerError) logger.error(`${req.method} ${req.path} failed`, error);
      res.status(known.status).json(known.body);
      return;
    }
    // Unknown errors may contain SQL or stack details: logged (sanitized), never echoed.
    logger.error(`Unhandled error on ${req.method} ${req.path}`, error);
    res.status(HttpStatus.InternalServerError).json(errorBody(ErrorCode.InternalError, 'An unexpected error occurred'));
  };
}
