import cors from 'cors';
import express, { type Express } from 'express';
import { ApiPath, CORS_PREFLIGHT_MAX_AGE_SECONDS, REQUEST_BODY_LIMIT } from './constants/api.js';
import { createErrorHandler } from './http/middleware/errorHandler.js';
import { notFoundHandler } from './http/middleware/notFoundHandler.js';
import { securityHeaders } from './http/middleware/securityHeaders.js';
import { createHealthRouter } from './http/routes/healthRouter.js';
import { createProfilesRouter } from './http/routes/profilesRouter.js';
import type { Logger } from './logger.js';
import type { ProfileService } from './services/profileService.js';

export interface AppDependencies {
  profileService: ProfileService;
  checkDatabaseHealth: () => Promise<void>;
  corsOrigins: readonly string[];
  logger: Logger;
}

export function createApp({ profileService, checkDatabaseHealth, corsOrigins, logger }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors({ origin: [...corsOrigins], maxAge: CORS_PREFLIGHT_MAX_AGE_SECONDS }));
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));

  app.use(ApiPath.Health, createHealthRouter(checkDatabaseHealth, logger));
  app.use(ApiPath.Profiles, createProfilesRouter(profileService));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
