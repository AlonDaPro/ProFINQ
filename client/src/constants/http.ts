export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Patch = 'PATCH',
  Delete = 'DELETE',
}

/** Only the statuses the client branches on. */
export enum HttpStatus {
  BadRequest = 400,
  NotFound = 404,
  Conflict = 409,
}

export enum HttpHeader {
  Accept = 'Accept',
  ContentType = 'Content-Type',
}

export const JSON_MEDIA_TYPE = 'application/json';

/** Long enough for a cold randomuser.me response, short enough that a hung request does not look like a frozen UI. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
