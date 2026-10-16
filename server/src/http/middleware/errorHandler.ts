import type { ErrorRequestHandler } from 'express';
import { ErrorCode } from '../../constants/errorCode.js';
import { CLIENT_ERROR_STATUS_RANGE, HttpStatus } from '../../constants/httpStatus.js';
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

function bodyParserError(error: Error): HttpErrorResponse | undefined {
  return 'type' in error && typeof error.type === 'string' ? BODY_PARSER_ERRORS.get(error.type) : undefined;
}

/**
 * Express and body-parser tag the bad requests they reject themselves (an aborted upload, a path
 * that is not valid percent-encoding) with a 4xx `status`; our own code never sets one. `expose`
 * marks the message as safe to echo.
 */
function frameworkClientError(error: Error): HttpErrorResponse | undefined {
  const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  if (status === undefined || status < CLIENT_ERROR_STATUS_RANGE.min || status > CLIENT_ERROR_STATUS_RANGE.max) {
    return undefined;
  }
  const message = 'expose' in error && error.expose === true ? error.message : 'Invalid request';
  return { status: HttpStatus.BadRequest, body: errorBody(ErrorCode.InvalidRequest, message) };
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
  if (!(error instanceof Error)) return undefined;
  const clientError = bodyParserError(error) ?? frameworkClientError(error);
  if (clientError) return clientError;
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
