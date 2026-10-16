import 'dotenv/config';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { checkDatabaseHealth, createPool } from '../src/db/pool.js';
import { Gender, Title, type Profile, type ProfileDetails } from '../src/domain/profile/index.js';
import type { RateLimits } from '../src/http/middleware/rateLimit.js';
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

/** Generous enough that no functional test is ever throttled; rate limiting has its own test. */
const UNTHROTTLED = { readsPerMinute: 10_000, writesPerMinute: 10_000 };

export function createTestApp(pool: Pool, rateLimits: RateLimits = UNTHROTTLED) {
  return createApp({
    profileService: new ProfileService(new PostgresProfileRepository(pool)),
    checkDatabaseHealth: () => checkDatabaseHealth(pool),
    corsOrigins: ['http://localhost:5173'],
    rateLimits,
    trustProxyHops: 0,
    logger: silentLogger,
  });
}

export async function createTestContext(): Promise<{ pool: Pool; app: ReturnType<typeof createApp> }> {
  const pool = createPool({
    connectionString: testDatabaseUrl(),
    maxConnections: 10,
    onIdleClientError: () => undefined,
  });
  await runMigrations(pool);
  return { pool, app: createTestApp(pool) };
}

export const PROFILE_ID = '3f1b9c2e-7a4d-4e8f-9b1a-2c3d4e5f6a7b';

export function buildDetails(overrides: Partial<ProfileDetails> = {}): ProfileDetails {
  return {
    name: { title: Title.Ms, first: 'Noa', last: 'Levi' },
    gender: Gender.Female,
    email: 'noa.levi@example.com',
    phone: '(272) 790-0888',
    location: {
      streetNumber: 8929,
      streetName: 'Valwood Pkwy',
      city: 'Billings',
      state: 'Michigan',
      country: 'United States',
    },
    dateOfBirth: '1993-07-20',
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: PROFILE_ID,
    ...buildDetails(),
    picture: {
      large: 'https://randomuser.me/api/portraits/women/1.jpg',
      thumbnail: 'https://randomuser.me/api/portraits/thumb/women/1.jpg',
    },
    ...overrides,
  };
}

/** Builds a request body with one nested value replaced, typed loosely on purpose: tests send bad data. */
export function withValue(body: object, path: string, value: unknown): Record<string, unknown> {
  const copy = structuredClone(body) as Record<string, unknown>;
  const keys = path.split('.');
  let target = copy;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys.at(-1) as string] = value;
  return copy;
}
