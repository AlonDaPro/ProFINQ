import type { Pool } from 'pg';
import type { Page, PageRequest } from '../domain/pagination.js';
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

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly pool: Pool) {}

  async listPage({ limit, after }: PageRequest): Promise<Page<SavedProfile>> {
    // Keyset pagination: the row comparison walks the (saved_at DESC, id DESC) index, so page
    // 1,000 costs the same as page 1, and rows saved meanwhile never shift or repeat a page.
    // One extra row tells us whether another page exists, without a COUNT(*).
    const fetchCount = limit + 1;
    const result = after
      ? await this.pool.query<ProfileRow>(
          `SELECT ${PROFILE_COLUMNS} FROM profiles
            WHERE (saved_at, id) < ($1::timestamptz, $2)
            ORDER BY saved_at DESC, id DESC
            LIMIT $3`,
          [after.savedAt, after.id, fetchCount],
        )
      : await this.pool.query<ProfileRow>(
          `SELECT ${PROFILE_COLUMNS} FROM profiles ORDER BY saved_at DESC, id DESC LIMIT $1`,
          [fetchCount],
        );
    const items = result.rows.slice(0, limit).map(toSavedProfile);
    const last = items.at(-1);
    const hasMore = result.rows.length > limit;
    return { items, nextCursor: hasMore && last ? { savedAt: last.savedAt, id: last.id } : null };
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
