export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

// Migrations are append-only: never edit one that may already have run somewhere,
// add a new version instead. They live in TS (not .sql files) so `tsc` ships them
// in dist/ without a copy step.
export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'create_profiles',
    sql: `
      CREATE TABLE profiles (
        id                    text        PRIMARY KEY,
        title                 text        NOT NULL,
        first_name            text        NOT NULL CHECK (btrim(first_name) <> ''),
        last_name             text        NOT NULL CHECK (btrim(last_name) <> ''),
        gender                text        NOT NULL,
        email                 text        NOT NULL,
        phone                 text        NOT NULL,
        picture_large_url     text        NOT NULL,
        picture_thumbnail_url text        NOT NULL,
        street_number         integer     NOT NULL CHECK (street_number >= 0),
        street_name           text        NOT NULL,
        city                  text        NOT NULL,
        state                 text        NOT NULL,
        country               text        NOT NULL,
        date_of_birth         timestamptz NOT NULL,
        saved_at              timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX profiles_saved_at_idx ON profiles (saved_at DESC);
    `,
  },
  {
    // Matches the list query's ORDER BY (saved_at DESC, id) exactly, so the list is read in
    // index order with no sort step, and it is the index keyset pagination will need.
    // On a large production table this would be CREATE INDEX CONCURRENTLY, outside the transaction.
    version: 2,
    name: 'index_profiles_by_saved_at_and_id',
    sql: `
      CREATE INDEX profiles_saved_at_id_idx ON profiles (saved_at DESC, id);
      DROP INDEX profiles_saved_at_idx;
    `,
  },
];
