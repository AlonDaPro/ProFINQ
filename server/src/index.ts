import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { checkDatabaseHealth, createPool, waitForDatabase } from './db/pool.js';
import { consoleLogger as logger } from './logger.js';
import { PostgresProfileRepository } from './repositories/postgresProfileRepository.js';
import { ProfileService } from './services/profileService.js';

/** In-flight requests get this long to finish after SIGTERM before the process is killed. */
const SHUTDOWN_GRACE_MS = 10_000;
/** `docker compose up` returns before Postgres accepts connections, so startup retries briefly (~10 s). */
const DATABASE_STARTUP_RETRY = { attempts: 10, delayMs: 1_000 } as const;
const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

enum ExitCode {
  Success = 0,
  Failure = 1,
}

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool({
    connectionString: config.DATABASE_URL,
    maxConnections: config.DB_POOL_SIZE,
    onIdleClientError: (error) => {
      logger.error('Idle PostgreSQL client error', error);
    },
  });

  await waitForDatabase(pool, DATABASE_STARTUP_RETRY);
  const appliedVersions = await runMigrations(pool);
  if (appliedVersions.length > 0) {
    logger.info('Applied database migrations', { versions: appliedVersions });
  }

  const app = createApp({
    profileService: new ProfileService(new PostgresProfileRepository(pool)),
    checkDatabaseHealth: () => checkDatabaseHealth(pool),
    corsOrigins: config.CORS_ORIGINS,
    rateLimits: {
      readsPerMinute: config.RATE_LIMIT_READS_PER_MINUTE,
      writesPerMinute: config.RATE_LIMIT_WRITES_PER_MINUTE,
    },
    trustProxyHops: config.TRUST_PROXY_HOPS,
    logger,
  });

  const server = app.listen(config.PORT, () => {
    logger.info('Profinq API listening', { address: server.address() });
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(ExitCode.Failure);
    }, SHUTDOWN_GRACE_MS);
    forceExit.unref();

    server.close(() => {
      pool
        .end()
        .then(() => process.exit(ExitCode.Success))
        .catch((error: unknown) => {
          logger.error('Failed to close database pool', error);
          process.exit(ExitCode.Failure);
        });
    });
  };

  for (const signal of SHUTDOWN_SIGNALS) process.on(signal, shutdown);
}

main().catch((error: unknown) => {
  logger.error('Failed to start server', error);
  process.exit(ExitCode.Failure);
});
