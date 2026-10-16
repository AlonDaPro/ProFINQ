import 'dotenv/config';
import { createAppPool } from './compose.js';
import { loadConfig } from './config/env.js';
import { ExitCode } from './constants/exitCode.js';
import { migrateWhenReady } from './db/migrate.js';
import { consoleLogger as logger } from './logger.js';

// `npm run migrate`: applies pending migrations and exits. Vercel runs it as the server's build step.
const pool = createAppPool(loadConfig(), logger, 1);

try {
  const applied = await migrateWhenReady(pool);
  logger.info('Database migrations are up to date', { applied });
} catch (error) {
  logger.error('Migration failed', error);
  process.exitCode = ExitCode.Failure;
} finally {
  await pool.end();
}
