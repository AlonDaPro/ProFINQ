import type { Express } from 'express';
import type pg from 'pg';
import { createApp } from './app.js';
import type { AppConfig } from './config/env.js';
import { checkDatabaseHealth, createPool } from './db/pool.js';
import type { Logger } from './logger.js';
import { PostgresProfileRepository } from './repositories/postgresProfileRepository.js';
import { ProfileService } from './services/profileService.js';

/** Wires config → pool → repository → service → app. Shared by the long-running server and the serverless entry. */
export function composeApp(config: AppConfig, logger: Logger): { app: Express; pool: pg.Pool } {
  const pool = createPool({
    connectionString: config.DATABASE_URL,
    maxConnections: config.DB_POOL_SIZE,
    onIdleClientError: (error) => {
      logger.error('Idle PostgreSQL client error', error);
    },
  });

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

  return { app, pool };
}
