import { Router } from 'express';
import { HealthStatus } from '../../constants/api.js';
import { HttpStatus } from '../../constants/httpStatus.js';
import type { Logger } from '../../logger.js';

export function createHealthRouter(checkDatabaseHealth: () => Promise<void>, logger: Logger): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      await checkDatabaseHealth();
      res.json({ status: HealthStatus.Ok });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(HttpStatus.ServiceUnavailable).json({ status: HealthStatus.Unavailable });
    }
  });

  return router;
}
