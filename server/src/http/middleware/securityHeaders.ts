import type { RequestHandler } from 'express';

/**
 * The API only returns JSON, so a few static headers cover what `helmet` would add here:
 * no MIME sniffing, no framing, no referrer leakage, a deny-all CSP, and no caching of
 * personal data by browsers or shared proxies.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-store',
};

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
};
