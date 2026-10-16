export enum ApiPath {
  Root = '/api',
  Health = '/api/health',
  Profiles = '/api/profiles',
  Countries = '/api/countries',
}

export enum HealthStatus {
  Ok = 'ok',
  Unavailable = 'unavailable',
}

/** The largest legitimate body is one profile (~1 KB); anything far bigger is a mistake or abuse. */
export const REQUEST_BODY_LIMIT = '32kb';

/** Lets browsers cache the CORS preflight, saving a round trip before each cross-origin mutation. */
export const CORS_PREFLIGHT_MAX_AGE_SECONDS = 600;

export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Page size for GET /api/profiles: a default that fills a screen, and a cap that bounds every response. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Most ids a single ?ids= lookup may ask about (one random batch is 10). */
export const MAX_IDS_PER_LOOKUP = 100;
/** A real cursor is about 100 characters; anything far longer is not one. */
export const MAX_CURSOR_LENGTH = 512;
/** The History name filter: long enough for any full name, short enough to keep the query cheap. */
export const MAX_NAME_FILTER_LENGTH = 100;
export const MAX_NAME_FILTER_WORDS = 8;
