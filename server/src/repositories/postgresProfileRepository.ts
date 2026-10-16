import type { Pool } from 'pg';
import type { ListFilter, Page, PageCursor, PageRequest } from '../domain/pagination.js';
import type { Gender, Profile, ProfileDetails, SavedProfile, Title } from '../domain/profile/index.js';
import type { ProfileRepository } from './profileRepository.js';

/** A `profiles` row. The CHECK constraints from migration 1 guarantee the enum columns. */
interface ProfileRow {
  id: string;
  title: Title | '';
  first_name: string;
  last_name: string;
  gender: Gender;
  email: string;
  phone: string;
  picture_large_url: string;
  picture_thumbnail_url: string;
  street_number: number;
  street_name: string;
  city: string;
  state: string;
  country: string;
  /** 'YYYY-MM-DD': pool.ts returns DATE columns as strings, never as timezone-shifted Dates. */
  date_of_birth: string;
  saved_at: Date;
  updated_at: Date;
}

const PROFILE_COLUMNS = `
  id, title, first_name, last_name, gender, email, phone,
  picture_large_url, picture_thumbnail_url,
  street_number, street_name, city, state, country,
  date_of_birth, saved_at, updated_at
`;

function toSavedProfile(row: ProfileRow): SavedProfile {
  return {
    id: row.id,
    name: { title: row.title, first: row.first_name, last: row.last_name },
    gender: row.gender,
    email: row.email,
    phone: row.phone,
    picture: { large: row.picture_large_url, thumbnail: row.picture_thumbnail_url },
    location: {
      streetNumber: row.street_number,
      streetName: row.street_name,
      city: row.city,
      state: row.state,
      country: row.country,
    },
    dateOfBirth: row.date_of_birth,
    savedAt: row.saved_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The editable columns in a fixed order, shared by INSERT and UPDATE ($2..$12). */
function detailValues(details: ProfileDetails): unknown[] {
  return [
    details.name.title,
    details.name.first,
    details.name.last,
    details.gender,
    details.email,
    details.phone,
    details.location.streetNumber,
    details.location.streetName,
    details.location.city,
    details.location.state,
    details.location.country,
    details.dateOfBirth,
  ];
}

/** LIKE treats % and _ as wildcards; a typed "50%" must match literally. Backslash is LIKE's escape. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** WHERE clauses for a page, with their parameters numbered in order. */
function pageConditions(filter: ListFilter, after: PageCursor | undefined): { where: string; params: unknown[] } {
  const params: unknown[] = [];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const conditions: string[] = [];
  if (after) conditions.push(`(saved_at, id) < (${param(after.savedAt)}::timestamptz, ${param(after.id)})`);
  if (filter.country !== undefined) conditions.push(`country = ${param(filter.country)}`);
  // The search term goes through the same function as the column, so both fold accents alike.
  for (const word of filter.nameWords) {
    conditions.push(`search_name LIKE '%' || profile_search_text(${param(escapeLike(word))}) || '%'`);
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly pool: Pool) {}

  async listPage({ limit, after, filter }: PageRequest): Promise<Page<SavedProfile>> {
    // Keyset pagination: the row comparison walks the (saved_at DESC, id DESC) index, so page
    // 1,000 costs the same as page 1, and rows saved meanwhile never shift or repeat a page.
    // One extra row tells us whether another page exists, without a COUNT(*).
    const { where, params } = pageConditions(filter, after);
    const result = await this.pool.query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles ${where}
        ORDER BY saved_at DESC, id DESC
        LIMIT $${params.length + 1}`,
      [...params, limit + 1],
    );
    const items = result.rows.slice(0, limit).map(toSavedProfile);
    const last = items.at(-1);
    const hasMore = result.rows.length > limit;
    return { items, nextCursor: hasMore && last ? { savedAt: last.savedAt, id: last.id } : null };
  }

  async listCountries(): Promise<string[]> {
    const result = await this.pool.query<{ country: string }>('SELECT DISTINCT country FROM profiles ORDER BY country');
    return result.rows.map((row) => row.country);
  }

  async findByIds(ids: readonly string[]): Promise<SavedProfile[]> {
    if (ids.length === 0) return [];
    const result = await this.pool.query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = ANY($1::text[]) ORDER BY saved_at DESC, id DESC`,
      [ids],
    );
    return result.rows.map(toSavedProfile);
  }

  async findById(id: string): Promise<SavedProfile | null> {
    const result = await this.pool.query<ProfileRow>(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? toSavedProfile(row) : null;
  }

  async insert(profile: Profile): Promise<SavedProfile | null> {
    // ON CONFLICT DO NOTHING makes duplicate detection atomic: two concurrent
    // saves of the same profile yield exactly one row and one `null`.
    const result = await this.pool.query<ProfileRow>(
      `INSERT INTO profiles (
         id, title, first_name, last_name, gender, email, phone,
         street_number, street_name, city, state, country, date_of_birth,
         picture_large_url, picture_thumbnail_url
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO NOTHING
       RETURNING ${PROFILE_COLUMNS}`,
      [profile.id, ...detailValues(profile), profile.picture.large, profile.picture.thumbnail],
    );
    const row = result.rows[0];
    return row ? toSavedProfile(row) : null;
  }

  async update(id: string, details: ProfileDetails): Promise<SavedProfile | null> {
    const result = await this.pool.query<ProfileRow>(
      `UPDATE profiles
          SET title = $2, first_name = $3, last_name = $4, gender = $5, email = $6, phone = $7,
              street_number = $8, street_name = $9, city = $10, state = $11, country = $12,
              date_of_birth = $13, updated_at = date_trunc('milliseconds', now())
        WHERE id = $1
        RETURNING ${PROFILE_COLUMNS}`,
      [id, ...detailValues(details)],
    );
    const row = result.rows[0];
    return row ? toSavedProfile(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM profiles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
