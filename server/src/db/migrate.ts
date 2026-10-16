import type { Pool } from 'pg';
import { migrations } from './migrations.js';
import { waitForDatabase } from './pool.js';

// Arbitrary constant shared by every instance of this service; holding it makes
// concurrent startups (e.g. several replicas) apply migrations one at a time.
const MIGRATION_LOCK_KEY = 728_461_903;
const MIGRATION_LOCK_TIMEOUT = '30s';

export async function runMigrations(pool: Pool): Promise<number[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // The role's 10 s statement timeout (migration 2) must not kill a deploy waiting for the lock or a long DDL.
    await client.query('SET LOCAL statement_timeout = 0');
    // ...but a deploy must fail, not hang, if another migration holds the lock for too long.
    await client.query(`SET LOCAL lock_timeout = '${MIGRATION_LOCK_TIMEOUT}'`);
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    integer     PRIMARY KEY,
        name       text        NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await client.query<{ version: number }>('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.rows.map((row) => row.version));
    const pending = [...migrations]
      .sort((a, b) => a.version - b.version)
      .filter((migration) => !appliedVersions.has(migration.version));

    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
        migration.version,
        migration.name,
      ]);
    }

    await client.query('COMMIT');
    return pending.map((migration) => migration.version);
  } catch (error) {
    // A failed ROLLBACK (e.g. connection lost) must not mask the original error.
    await client.query('ROLLBACK').catch(() => undefined);
    throw new Error('Database migration failed; no changes were applied', { cause: error });
  } finally {
    client.release();
  }
}

/** Waits for the database to accept connections (it may still be starting), then migrates it. */
export async function migrateWhenReady(pool: Pool): Promise<number[]> {
  await waitForDatabase(pool);
  return runMigrations(pool);
}
