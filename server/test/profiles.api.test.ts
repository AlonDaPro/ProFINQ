import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { buildProfile, createTestContext } from './helpers.js';

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

describe('POST /api/profiles', () => {
  it('persists a profile and returns it with server timestamps', async () => {
    const profile = buildProfile();

    const response = await request(app).post('/api/profiles').send(profile).expect(201);

    expect(response.headers.location).toBe(`/api/profiles/${profile.id}`);
    expect(response.body).toMatchObject(profile);
    expect(typeof response.body.savedAt).toBe('string');

    const list = await request(app).get('/api/profiles').expect(200);
    expect(list.body.profiles).toHaveLength(1);
  });

  it('trims surrounding whitespace before storing', async () => {
    const profile = buildProfile({ name: { title: ' Ms ', first: '  Noa ', last: 'Levi  ' } });

    const response = await request(app).post('/api/profiles').send(profile).expect(201);

    expect(response.body.name).toEqual({ title: 'Ms', first: 'Noa', last: 'Levi' });
  });

  it('rejects a duplicate save with 409', async () => {
    await request(app).post('/api/profiles').send(buildProfile()).expect(201);

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

  it.each([
    ['a blank first name', buildProfile({ name: { title: 'Ms', first: '   ', last: 'Levi' } })],
    [
      'a non-https picture',
      buildProfile({ picture: { large: 'javascript:alert(1)', thumbnail: 'https://x.io/a.jpg' } }),
    ],
    ['a picture that is not a URL', buildProfile({ picture: { large: 'nope', thumbnail: 'https://x.io/a.jpg' } })],
    ['an invalid email', buildProfile({ email: 'not-an-email' })],
    ['a future date of birth', buildProfile({ dateOfBirth: '2999-01-01T00:00:00.000Z' })],
    ['an id with illegal characters', buildProfile({ id: "x'; DROP TABLE profiles; --" })],
  ])('rejects %s with 400 and field details', async (_label, payload) => {
    const response = await request(app).post('/api/profiles').send(payload).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('accepts real randomuser.me emails that strict RFC validators reject', async () => {
    // Seen in production data for German names like "Hans-J.": consecutive dots in the local part.
    const profile = buildProfile({ email: 'hans-j..diederich@example.com' });

    await request(app).post('/api/profiles').send(profile).expect(201);
  });

  it('rejects a body larger than the limit with 413', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .send({ ...buildProfile(), padding: 'x'.repeat(40_000) })
      .expect(413);

    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('answers other unreadable bodies with their 4xx, not a 500', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .set('Content-Type', 'application/json; charset=koi8-r')
      .send('{}')
      .expect(415);

    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });

  it('rejects unknown fields instead of silently dropping them', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .send({ ...buildProfile(), isAdmin: true })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
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
  it('returns 404 for an unknown profile', async () => {
    const response = await request(app).get('/api/profiles/does-not-exist').expect(404);

    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('round-trips non-Latin names unchanged', async () => {
    const profile = buildProfile({ name: { title: 'آقای', first: 'نیما', last: 'رضایی' } });
    await request(app).post('/api/profiles').send(profile).expect(201);

    const response = await request(app).get(`/api/profiles/${profile.id}`).expect(200);

    expect(response.body.name).toEqual(profile.name);
  });
});

describe('PATCH /api/profiles/:id', () => {
  it('updates only the name and bumps updatedAt', async () => {
    const profile = buildProfile();
    const created = await request(app).post('/api/profiles').send(profile).expect(201);

    const response = await request(app)
      .patch(`/api/profiles/${profile.id}`)
      .send({ name: { title: 'Dr', first: 'Noam', last: 'Cohen' } })
      .expect(200);

    expect(response.body.name).toEqual({ title: 'Dr', first: 'Noam', last: 'Cohen' });
    expect(response.body.email).toBe(profile.email);
    expect(Date.parse(response.body.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.body.updatedAt));
  });

  it('returns 404 when the profile does not exist', async () => {
    await request(app)
      .patch('/api/profiles/missing')
      .send({ name: { title: '', first: 'A', last: 'B' } })
      .expect(404);
  });

  it('refuses to change anything other than the name', async () => {
    const profile = buildProfile();
    await request(app).post('/api/profiles').send(profile).expect(201);

    await request(app)
      .patch(`/api/profiles/${profile.id}`)
      .send({ name: profile.name, email: 'hijack@example.com' })
      .expect(400);
  });
});

describe('DELETE /api/profiles/:id', () => {
  it('removes the profile', async () => {
    const profile = buildProfile();
    await request(app).post('/api/profiles').send(profile).expect(201);

    await request(app).delete(`/api/profiles/${profile.id}`).expect(204);

    await request(app).get(`/api/profiles/${profile.id}`).expect(404);
  });

  it('returns 404 when the profile does not exist', async () => {
    await request(app).delete('/api/profiles/missing').expect(404);
  });
});

describe('infrastructure', () => {
  it('reports health', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });

  it('sends security headers and no framework fingerprint', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('only allows configured CORS origins', async () => {
    const allowed = await request(app).get('/api/profiles').set('Origin', 'http://localhost:5173');
    const denied = await request(app).get('/api/profiles').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nope').expect(404);

    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('is idempotent when migrations run again', async () => {
    await expect(runMigrations(pool)).resolves.toEqual([]);
  });
});

describe('database', () => {
  it('serves the newest-first list from the (saved_at, id) index without a sort step', async () => {
    // SET is per connection, so the whole check runs on one checked-out client.
    const client = await pool.connect();
    try {
      // On a near-empty table a sequential scan is cheaper; disable it to see which index the planner picks.
      await client.query('SET enable_seqscan = off');
      const { rows } = await client.query<{ 'QUERY PLAN': string }>(
        'EXPLAIN SELECT id FROM profiles ORDER BY saved_at DESC, id',
      );
      const plan = rows.map((row) => row['QUERY PLAN']).join('\n');

      expect(plan).toContain('profiles_saved_at_id_idx');
      expect(plan).not.toMatch(/\bSort\b/);
    } finally {
      await client.query('RESET enable_seqscan');
      client.release();
    }
  });
});
