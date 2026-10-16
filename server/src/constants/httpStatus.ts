export enum HttpStatus {
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  NotFound = 404,
  Conflict = 409,
  PayloadTooLarge = 413,
  UnsupportedMediaType = 415,
  TooManyRequests = 429,
  InternalServerError = 500,
  ServiceUnavailable = 503,
}

/** 4xx: the request is at fault. */
export const CLIENT_ERROR_STATUS_RANGE = { min: 400, max: 499 } as const;
