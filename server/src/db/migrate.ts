import type { Pool } from 'pg';
import { migrations as defaultMigrations, type Migration } from './migrations.js';

// Arbitrary constant shared by every instance of this service; holding it makes
// concurrent startups (e.g. several replicas) apply migrations one at a time.
const MIGRATION_LOCK_KEY = 728_461_903;

export async function runMigrations(
  pool: Pool,
  migrations: readonly Migration[] = defaultMigrations,
): Promise<number[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // The pool's 10 s statement timeout must not kill a replica waiting for the lock or a long DDL.
    await client.query('SET LOCAL statement_timeout = 0');
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
