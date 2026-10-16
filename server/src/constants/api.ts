export enum ApiPath {
  Health = '/api/health',
  Profiles = '/api/profiles',
}

export enum HealthStatus {
  Ok = 'ok',
  Unavailable = 'unavailable',
}

/** The largest legitimate body is one profile (~1 KB); anything far bigger is a mistake or abuse. */
export const REQUEST_BODY_LIMIT = '32kb';

/** Lets browsers cache the CORS preflight, saving a round trip before each cross-origin mutation. */
export const CORS_PREFLIGHT_MAX_AGE_SECONDS = 600;
