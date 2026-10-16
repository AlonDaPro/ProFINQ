import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { createApp } from '../src/app.js';
import { Gender, Title } from '../src/domain/profile/index.js';
import { buildDetails, buildProfile, createTestContext, PROFILE_ID, withValue } from './helpers.js';

let pool: Pool;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  ({ pool, app } = await createTestContext());
});

beforeEach(async () => {
  await pool.query('TRUNCATE profiles');
});

afterAll(async () => {
  await pool.end();
});

const PROFILE_URL = `/api/profiles/${PROFILE_ID}`;

interface ErrorDetail {
  path: string;
  message: string;
}

const detailPaths = (body: { error: { details: ErrorDetail[] } }) => body.error.details.map((detail) => detail.path);

async function saveProfile(id = PROFILE_ID) {
  return request(app)
    .post('/api/profiles')
    .send({ ...buildProfile(), id })
    .expect(201);
}

/** Inserts `count` profiles with strictly increasing saved_at, directly, to set up paging. */
async function seedProfiles(count: number): Promise<string[]> {
  const ids = Array.from({ length: count }, (_, index) => `seed-${String(index).padStart(3, '0')}`);
  for (const [index, id] of ids.entries()) {
    await saveProfile(id);
    await pool.query(
      `UPDATE profiles SET saved_at = TIMESTAMPTZ '2026-01-01' + make_interval(secs => $2) WHERE id = $1`,
      [id, index],
    );
  }
  return ids.reverse(); // newest first, the list's order
}

describe('POST /api/profiles', () => {
  it('persists a profile and returns it with server timestamps and a Location header', async () => {
    const response = await saveProfile();

    expect(response.headers.location).toBe(PROFILE_URL);
    expect(response.body).toMatchObject(buildProfile());
    expect(Date.parse(response.body.savedAt)).not.toBeNaN();
    const stored = await request(app).get(PROFILE_URL).expect(200);
    expect(stored.body).toEqual(response.body);
  });

  it('stores trimmed values', async () => {
    const body = withValue(buildProfile(), 'name.first', '  Noa  ');

    const response = await request(app).post('/api/profiles').send(body).expect(201);

    expect(response.body.name.first).toBe('Noa');
  });

  it('stores the date of birth as the same calendar day it was given', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .send({ ...buildProfile(), dateOfBirth: '1990-01-01' })
      .expect(201);

    expect(response.body.dateOfBirth).toBe('1990-01-01');
  });

  it('rejects a duplicate save with 409', async () => {
    await saveProfile();

    const response = await request(app).post('/api/profiles').send(buildProfile()).expect(409);

    expect(response.body.error.code).toBe('PROFILE_ALREADY_EXISTS');
  });

  it('stores exactly one row when the same profile is saved concurrently', async () => {
    const attempts = Array.from({ length: 8 }, () => request(app).post('/api/profiles').send(buildProfile()));

    const statuses = (await Promise.all(attempts)).map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    const { rows } = await pool.query<{ count: string }>('SELECT count(*) FROM profiles');
    expect(rows[0]?.count).toBe('1');
  });

  it('answers invalid input with 400 and every problem, located in the body', async () => {
    const body = withValue(withValue(buildProfile(), 'email', 'nope'), 'location.streetNumber', '12');

    const response = await request(app).post('/api/profiles').send(body).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(detailPaths(response.body)).toEqual(expect.arrayContaining(['body.email', 'body.location.streetNumber']));
  });

  it('answers a missing body with a located error', async () => {
    const response = await request(app).post('/api/profiles').expect(400);

    expect(detailPaths(response.body)).toEqual(['body']);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .set('Content-Type', 'application/json')
      .send('{"id": ')
      .expect(400);

    expect(response.body.error.code).toBe('MALFORMED_JSON');
  });
});

describe('GET /api/profiles/:id', () => {
  it('answers a path that is not valid percent-encoding with 400, not 500', async () => {
    const response = await request(app).get('/api/profiles/%E0%A4%A').expect(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 404 for an unknown profile', async () => {
    const response = await request(app).get('/api/profiles/does-not-exist').expect(404);

    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('returns 400, located in the params, for an id that could never exist', async () => {
    const response = await request(app).get('/api/profiles/bad!id').expect(400);

    expect(detailPaths(response.body)).toEqual(['params.id']);
  });

  it('round-trips non-Latin text unchanged', async () => {
    const body = { ...buildProfile(), name: { title: Title.Mr, first: 'נועם', last: 'رضایی' } };
    await request(app).post('/api/profiles').send(body).expect(201);

    const response = await request(app).get(PROFILE_URL).expect(200);

    expect(response.body.name).toEqual(body.name);
  });
});

describe('GET /api/profiles (pagination)', () => {
  it('returns an empty first page and no cursor when nothing is saved', async () => {
    const response = await request(app).get('/api/profiles').expect(200);

    expect(response.body).toEqual({ profiles: [], nextCursor: null });
  });

  it('walks every profile exactly once, newest first, following the cursor', async () => {
    const expected = await seedProfiles(7);

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: Record<string, string> = { limit: '3', ...(cursor ? { cursor } : {}) };
      const response = await request(app).get('/api/profiles').query(query).expect(200);
      expect(response.body.profiles.length).toBeLessThanOrEqual(3);
      seen.push(...response.body.profiles.map((profile: { id: string }) => profile.id));
      cursor = response.body.nextCursor;
    } while (cursor);

    expect(seen).toEqual(expected);
  });

  it('ends with a null cursor exactly when the last page is full', async () => {
    await seedProfiles(3);

    const response = await request(app).get('/api/profiles').query({ limit: '3' }).expect(200);

    expect(response.body.profiles).toHaveLength(3);
    expect(response.body.nextCursor).toBeNull();
  });

  it('breaks ties on saved_at by id, so no row is skipped or repeated', async () => {
    for (const id of ['tie-a', 'tie-b', 'tie-c']) await saveProfile(id);
    await pool.query(`UPDATE profiles SET saved_at = TIMESTAMPTZ '2026-01-01'`);

    const first = await request(app).get('/api/profiles').query({ limit: '2' }).expect(200);
    const second = await request(app).get('/api/profiles').query({ cursor: first.body.nextCursor }).expect(200);

    const ids = [...first.body.profiles, ...second.body.profiles].map((profile: { id: string }) => profile.id);
    expect(ids).toEqual(['tie-c', 'tie-b', 'tie-a']);
  });

  it('keeps later pages stable when new profiles are saved meanwhile', async () => {
    const expected = await seedProfiles(4);
    const first = await request(app).get('/api/profiles').query({ limit: '2' }).expect(200);

    await saveProfile('brand-new');
    const second = await request(app).get('/api/profiles').query({ limit: '2', cursor: first.body.nextCursor });

    expect(second.body.profiles.map((profile: { id: string }) => profile.id)).toEqual(expected.slice(2));
  });

  it.each([
    ['a limit above the cap', { limit: '101' }],
    ['a zero limit', { limit: '0' }],
    ['a non-numeric limit', { limit: 'ten' }],
    ['a hexadecimal limit', { limit: '0x10' }],
    ['an exponent limit', { limit: '1e1' }],
    ['a tampered cursor', { cursor: 'not-a-cursor' }],
    ['a cursor with a forged payload', { cursor: Buffer.from('{"savedAt":"x","id":"y"}').toString('base64url') }],
    [
      'a well-formed cursor whose instant Postgres cannot store',
      { cursor: Buffer.from('{"savedAt":"0000-01-01T00:00:00Z","id":"a"}').toString('base64url') },
    ],
    ['an unknown parameter', { sort: 'name' }],
  ])('rejects %s with 400', async (_label, query) => {
    const response = await request(app).get('/api/profiles').query(query).expect(400);

    expect(detailPaths(response.body)[0]).toMatch(/^query/);
  });
});

describe('GET /api/profiles?ids=', () => {
  it('returns only the saved profiles among the requested ids', async () => {
    await saveProfile('saved-1');
    await saveProfile('saved-2');

    const response = await request(app).get('/api/profiles').query({ ids: 'saved-1,missing,saved-2' }).expect(200);

    const ids = response.body.profiles.map((profile: { id: string }) => profile.id).sort();
    expect(ids).toEqual(['saved-1', 'saved-2']);
    expect(response.body.nextCursor).toBeNull();
  });

  it.each([
    ['an invalid id', { ids: 'ok,bad!id' }],
    ['more than 100 ids', { ids: Array.from({ length: 101 }, (_, index) => `id-${index}`).join(',') }],
    ['ids together with a cursor', { ids: 'a', limit: '5' }],
  ])('rejects %s with 400', async (_label, query) => {
    await request(app).get('/api/profiles').query(query).expect(400);
  });
});

describe('PUT /api/profiles/:id', () => {
  it('replaces every editable field and moves updatedAt to now', async () => {
    const created = await saveProfile();
    const edited = buildDetails({
      name: { title: Title.Dr, first: 'Noam', last: 'Cohen' },
      gender: Gender.Male,
      email: 'noam.cohen@example.co.il',
      phone: '+972586043122',
      location: { streetNumber: 12, streetName: 'Herzl', city: 'Haifa', state: 'Haifa District', country: 'Israel' },
      dateOfBirth: '1985-01-30',
    });
    // Back-date it, so the assertion below can only pass if the UPDATE really set a new value.
    await pool.query(`UPDATE profiles SET updated_at = TIMESTAMPTZ '2000-01-01'`);
    const before = Date.now();

    const response = await request(app).put(PROFILE_URL).send(edited).expect(200);

    expect(response.body).toMatchObject(edited);
    expect(Date.parse(response.body.updatedAt)).toBeGreaterThanOrEqual(before - 1_000);
    expect(response.body.savedAt).toBe(created.body.savedAt);
    const stored = await request(app).get(PROFILE_URL).expect(200);
    expect(stored.body).toEqual(response.body);
  });

  it('keeps the id, picture and savedAt untouched', async () => {
    const created = await saveProfile();

    const response = await request(app).put(PROFILE_URL).send(buildDetails()).expect(200);

    expect(response.body.id).toBe(PROFILE_ID);
    expect(response.body.picture).toEqual(created.body.picture);
    expect(response.body.savedAt).toBe(created.body.savedAt);
  });

  it.each([
    ['the id', { ...buildDetails(), id: 'hijacked' }],
    ['the picture', { ...buildDetails(), picture: buildProfile().picture }],
    ['server timestamps', { ...buildDetails(), savedAt: '2000-01-01T00:00:00.000Z' }],
  ])('refuses a body that tries to change %s', async (_label, body) => {
    await saveProfile();

    await request(app).put(PROFILE_URL).send(body).expect(400);
  });

  it('requires the complete set of details', async () => {
    await saveProfile();
    const partial: Partial<ReturnType<typeof buildDetails>> = buildDetails();
    delete partial.email;

    const response = await request(app).put(PROFILE_URL).send(partial).expect(400);

    expect(detailPaths(response.body)).toContain('body.email');
  });

  it('leaves the stored profile unchanged when validation fails', async () => {
    await saveProfile();

    await request(app)
      .put(PROFILE_URL)
      .send(withValue(buildDetails(), 'name.first', '123'))
      .expect(400);

    const stored = await request(app).get(PROFILE_URL).expect(200);
    expect(stored.body.name.first).toBe('Noa');
  });

  it('returns 404 when the profile does not exist', async () => {
    const response = await request(app).put(PROFILE_URL).send(buildDetails()).expect(404);

    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});

describe('DELETE /api/profiles/:id', () => {
  it('removes the profile', async () => {
    await saveProfile();

    await request(app).delete(PROFILE_URL).expect(204);

    await request(app).get(PROFILE_URL).expect(404);
  });

  it('returns 404 when the profile does not exist', async () => {
    await request(app).delete(PROFILE_URL).expect(404);
  });
});
