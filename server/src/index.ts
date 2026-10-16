import 'dotenv/config';
import { composeApp } from './compose.js';
import { loadConfig } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { DATABASE_STARTUP_RETRY, waitForDatabase } from './db/pool.js';
import { consoleLogger as logger } from './logger.js';

// The long-running server (local development, Docker, any VM). On Vercel, src/serverless.ts is the entry.

/** In-flight requests get this long to finish after SIGTERM before the process is killed. */
const SHUTDOWN_GRACE_MS = 10_000;
const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

enum ExitCode {
  Success = 0,
  Failure = 1,
}

async function main(): Promise<void> {
  const config = loadConfig();
  const { app, pool } = composeApp(config, logger);

  await waitForDatabase(pool, DATABASE_STARTUP_RETRY);
  const appliedVersions = await runMigrations(pool);
  if (appliedVersions.length > 0) {
    logger.info('Applied database migrations', { versions: appliedVersions });
  }

  // Express 5 hands listen errors (e.g. EADDRINUSE) to this callback instead of throwing.
  const server = app.listen(config.PORT, (error?: Error) => {
    if (error) {
      logger.error('Failed to start listening', error);
      process.exit(ExitCode.Failure);
    }
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
