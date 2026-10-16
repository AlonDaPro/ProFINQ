import type { Pool } from 'pg';
import type { Profile, ProfileName, SavedProfile } from '../domain/profile/index.js';
import type { ProfileRepository } from './profileRepository.js';

interface ProfileRow {
  id: string;
  title: string;
  first_name: string;
  last_name: string;
  gender: string;
  email: string;
  phone: string;
  picture_large_url: string;
  picture_thumbnail_url: string;
  street_number: number;
  street_name: string;
  city: string;
  state: string;
  country: string;
  date_of_birth: Date;
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
    dateOfBirth: row.date_of_birth.toISOString(),
    savedAt: row.saved_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<SavedProfile[]> {
    const result = await this.pool.query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles ORDER BY saved_at DESC, id`,
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
         picture_large_url, picture_thumbnail_url,
         street_number, street_name, city, state, country, date_of_birth
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO NOTHING
       RETURNING ${PROFILE_COLUMNS}`,
      [
        profile.id,
        profile.name.title,
        profile.name.first,
        profile.name.last,
        profile.gender,
        profile.email,
        profile.phone,
        profile.picture.large,
        profile.picture.thumbnail,
        profile.location.streetNumber,
        profile.location.streetName,
        profile.location.city,
        profile.location.state,
        profile.location.country,
        profile.dateOfBirth,
      ],
    );
    const row = result.rows[0];
    return row ? toSavedProfile(row) : null;
  }

  async updateName(id: string, name: ProfileName): Promise<SavedProfile | null> {
    const result = await this.pool.query<ProfileRow>(
      `UPDATE profiles
          SET title = $2, first_name = $3, last_name = $4, updated_at = now()
        WHERE id = $1
        RETURNING ${PROFILE_COLUMNS}`,
      [id, name.title, name.first, name.last],
    );
    const row = result.rows[0];
    return row ? toSavedProfile(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM profiles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
