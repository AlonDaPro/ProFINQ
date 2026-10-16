import type { RequestHandler } from 'express';

/**
 * The API only ever returns JSON, so a few static headers cover what `helmet`
 * would add here, without the dependency: no MIME sniffing, no framing, no
 * referrer leakage, and a CSP that forbids everything, because nothing should
 * ever render an API response as a document.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
};
