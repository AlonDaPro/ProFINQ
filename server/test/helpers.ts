import 'dotenv/config';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { checkDatabaseHealth, createPool } from '../src/db/pool.js';
import type { Profile } from '../src/domain/profile/index.js';
import type { Logger } from '../src/logger.js';
import { PostgresProfileRepository } from '../src/repositories/postgresProfileRepository.js';
import { ProfileService } from '../src/services/profileService.js';

const silentLogger: Logger = { info: () => undefined, error: () => undefined };

const DEFAULT_TEST_DATABASE_URL = 'postgres://profiles:profiles@localhost:5432/profiles_test';

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const databaseName = new URL(url).pathname.slice(1);
  // The suite truncates tables; refuse to run against anything not clearly a test DB.
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${databaseName}": database name must end with "_test"`);
  }
  return url;
}

export async function createTestContext(): Promise<{ pool: Pool; app: ReturnType<typeof createApp> }> {
  const pool = createPool(testDatabaseUrl(), () => undefined);
  await runMigrations(pool);
  const app = createApp({
    profileService: new ProfileService(new PostgresProfileRepository(pool)),
    checkDatabaseHealth: () => checkDatabaseHealth(pool),
    corsOrigins: ['http://localhost:5173'],
    logger: silentLogger,
  });
  return { pool, app };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '3f1b9c2e-7a4d-4e8f-9b1a-2c3d4e5f6a7b',
    name: { title: 'Ms', first: 'Noa', last: 'Levi' },
    gender: 'female',
    email: 'noa.levi@example.com',
    phone: '(272) 790-0888',
    picture: {
      large: 'https://randomuser.me/api/portraits/women/1.jpg',
      thumbnail: 'https://randomuser.me/api/portraits/thumb/women/1.jpg',
    },
    location: {
      streetNumber: 8929,
      streetName: 'Valwood Pkwy',
      city: 'Billings',
      state: 'Michigan',
      country: 'United States',
    },
    dateOfBirth: '1993-07-20T09:44:18.674Z',
    ...overrides,
  };
}
