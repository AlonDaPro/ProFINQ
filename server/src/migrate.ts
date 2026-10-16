import 'dotenv/config';
import { loadConfig } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { createPool, DATABASE_STARTUP_RETRY, waitForDatabase } from './db/pool.js';
import { consoleLogger as logger } from './logger.js';

// `npm run migrate`: applies pending migrations and exits. Vercel runs it as the server's build step.
const config = loadConfig();
const pool = createPool({
  connectionString: config.DATABASE_URL,
  maxConnections: 1,
  onIdleClientError: (error) => {
    logger.error('Idle PostgreSQL client error', error);
  },
});

try {
  await waitForDatabase(pool, DATABASE_STARTUP_RETRY);
  const appliedVersions = await runMigrations(pool);
  logger.info('Database migrations are up to date', { applied: appliedVersions });
} catch (error) {
  logger.error('Migration failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
