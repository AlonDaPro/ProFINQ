/** Machine-readable `error.code` values. Part of the public API contract: never rename one. */
export enum ErrorCode {
  ValidationFailed = 'VALIDATION_FAILED',
  MalformedJson = 'MALFORMED_JSON',
  InvalidRequest = 'INVALID_REQUEST',
  PayloadTooLarge = 'PAYLOAD_TOO_LARGE',
  ProfileNotFound = 'PROFILE_NOT_FOUND',
  ProfileAlreadyExists = 'PROFILE_ALREADY_EXISTS',
  RouteNotFound = 'ROUTE_NOT_FOUND',
  TooManyRequests = 'TOO_MANY_REQUESTS',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  InternalError = 'INTERNAL_ERROR',
}
