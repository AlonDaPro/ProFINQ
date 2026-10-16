interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

// Append-only: never edit a migration that may have run somewhere; add a new version.
// They live in TS (not .sql files) so `tsc` ships them in dist/ without a copy step.
export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'create_profiles',
    // Value lists are literals on purpose: a migration is a snapshot of the schema at one point
    // in time and must not change when the application's enums do.
    sql: `
      CREATE TABLE profiles (
        id                    text        PRIMARY KEY,
        title                 text        NOT NULL
                                          CHECK (title IN ('', 'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Master', 'Rev', 'Sir', 'Mx')),
        first_name            text        NOT NULL CHECK (btrim(first_name) <> ''),
        last_name             text        NOT NULL CHECK (btrim(last_name) <> ''),
        gender                text        NOT NULL CHECK (gender IN ('male', 'female')),
        email                 text        NOT NULL,
        phone                 text        NOT NULL,
        picture_large_url     text        NOT NULL,
        picture_thumbnail_url text        NOT NULL,
        street_number         integer     NOT NULL CHECK (street_number BETWEEN 1 AND 99999),
        street_name           text        NOT NULL,
        city                  text        NOT NULL,
        state                 text        NOT NULL,
        country               text        NOT NULL,
        -- A birthday is a calendar day, not an instant: no timezone can shift it.
        date_of_birth         date        NOT NULL CHECK (date_of_birth >= DATE '1900-01-01'),
        -- Millisecond precision, so a JavaScript Date round-trips exactly (the pagination cursor relies on it).
        saved_at              timestamptz NOT NULL DEFAULT date_trunc('milliseconds', now()),
        updated_at            timestamptz NOT NULL DEFAULT date_trunc('milliseconds', now())
      );

      -- Serves the newest-first list and its keyset pagination without a sort step.
      CREATE INDEX profiles_saved_at_id_idx ON profiles (saved_at DESC, id DESC);
    `,
  },
  {
    version: 2,
    name: 'statement_timeout',
    // A runaway query is killed by Postgres instead of holding a pooled connection forever. Set as
    // this role's default in this database, not sent on connect: connection poolers such as
    // PgBouncer (Neon's pooled URL) reject statement_timeout as a startup parameter.
    sql: `
      DO $$
      BEGIN
        EXECUTE format('ALTER ROLE %I IN DATABASE %I SET statement_timeout = %L',
                       current_user, current_database(), '10s');
      END
      $$;
    `,
  },
  {
    version: 3,
    name: 'profile_search',
    // History filters on the server, so a filter covers every saved profile, not just loaded pages.
    sql: `
      CREATE EXTENSION IF NOT EXISTS unaccent;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      -- Case- and accent-insensitive search text ("José" -> "jose"). unaccent() is only STABLE
      -- because its dictionary could change; pinning the dictionary makes this wrapper safe to
      -- declare IMMUTABLE, which a generated column and its index require.
      CREATE FUNCTION profile_search_text(value text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        RETURN lower(public.unaccent('public.unaccent'::regdictionary, value));

      -- Kept in step by Postgres itself: no write path can forget to update it.
      ALTER TABLE profiles
        ADD COLUMN search_name text NOT NULL
        GENERATED ALWAYS AS (profile_search_text(title || ' ' || first_name || ' ' || last_name)) STORED;

      -- Trigrams serve "contains" (LIKE '%word%'), which a B-tree cannot.
      CREATE INDEX profiles_search_name_trgm_idx ON profiles USING gin (search_name gin_trgm_ops);
      -- A country filter walks this in list order, so it pages like the unfiltered list.
      CREATE INDEX profiles_country_saved_at_id_idx ON profiles (country, saved_at DESC, id DESC);
    `,
  },
];
