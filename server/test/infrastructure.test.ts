import pg, { type Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { buildProfile, createTestApp, createTestContext, testDatabaseUrl } from './helpers.js';

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

describe('HTTP hardening', () => {
  it('reports health', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });

  it('sends security headers and no framework fingerprint', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('only allows configured CORS origins', async () => {
    const allowed = await request(app).get('/api/profiles').set('Origin', 'http://localhost:5173');
    const denied = await request(app).get('/api/profiles').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
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

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nope').expect(404);

    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('rate limiting', () => {
  it('answers 429 with the error envelope once the write budget is spent, while reads still work', async () => {
    const limitedApp = createTestApp(pool, { readsPerMinute: 100, writesPerMinute: 2 });

    await request(limitedApp).delete('/api/profiles/a').expect(404);
    await request(limitedApp).delete('/api/profiles/b').expect(404);
    const throttled = await request(limitedApp).delete('/api/profiles/c').expect(429);

    expect(throttled.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(throttled.headers.ratelimit).toBeDefined();
    await request(limitedApp).get('/api/profiles').expect(200);
  });

  it('counts the health check as a read, since it queries the database', async () => {
    const limitedApp = createTestApp(pool, { readsPerMinute: 1, writesPerMinute: 1 });

    await request(limitedApp).get('/api/health').expect(200);
    await request(limitedApp).get('/api/health').expect(429);
  });

  it('counts a write before parsing its body, so a malformed flood is refused too', async () => {
    const limitedApp = createTestApp(pool, { readsPerMinute: 1, writesPerMinute: 1 });
    const malformed = () =>
      request(limitedApp).post('/api/profiles').set('Content-Type', 'application/json').send('{"broken"');

    await malformed().expect(400);
    await malformed().expect(429);
  });
});

describe('database', () => {
  it('is idempotent when migrations run again', async () => {
    await expect(runMigrations(pool)).resolves.toEqual([]);
  });

  it('gives every new connection a statement timeout, without sending it on connect (poolers reject that)', async () => {
    const client = new pg.Client({ connectionString: testDatabaseUrl() });
    await client.connect();
    try {
      const { rows } = await client.query<{ statement_timeout: string }>('SHOW statement_timeout');
      expect(rows[0]?.statement_timeout).toBe('10s');
    } finally {
      await client.end();
    }
  });

  /** EXPLAIN on one checked-out client: SET is per connection. */
  async function queryPlan(sql: string, params: unknown[] = []): Promise<string> {
    const client = await pool.connect();
    try {
      // On a near-empty table a sequential scan is cheaper; disable it to see which index the planner picks.
      await client.query('SET enable_seqscan = off');
      const { rows } = await client.query<{ 'QUERY PLAN': string }>(`EXPLAIN ${sql}`, params);
      return rows.map((row) => row['QUERY PLAN']).join('\n');
    } finally {
      await client.query('RESET enable_seqscan');
      client.release();
    }
  }

  it.each([
    ['the first page', 'SELECT id FROM profiles ORDER BY saved_at DESC, id DESC LIMIT 21', []],
    [
      'a page after a cursor',
      'SELECT id FROM profiles WHERE (saved_at, id) < ($1::timestamptz, $2) ORDER BY saved_at DESC, id DESC LIMIT 21',
      ['2026-01-01T00:00:00.000Z', 'some-id'],
    ],
  ])('reads %s from the (saved_at, id) index with no sort step', async (_label, sql, params) => {
    const plan = await queryPlan(sql, params);

    expect(plan).toContain('profiles_saved_at_id_idx');
    expect(plan).not.toMatch(/\bSort\b/);
  });

  it('serves a country filter from the (country, saved_at, id) index with no sort step', async () => {
    const plan = await queryPlan(
      'SELECT id FROM profiles WHERE country = $1 ORDER BY saved_at DESC, id DESC LIMIT 21',
      ['Spain'],
    );

    expect(plan).toContain('profiles_country_saved_at_id_idx');
    expect(plan).not.toMatch(/\bSort\b/);
  });

  it('serves a name search ("contains") from the trigram index', async () => {
    const plan = await queryPlan(
      `SELECT id FROM profiles WHERE search_name LIKE '%' || profile_search_text($1) || '%'`,
      ['garcia'],
    );

    expect(plan).toContain('profiles_search_name_trgm_idx');
  });

  it('looks up a batch of ids through the primary key', async () => {
    const plan = await queryPlan('SELECT id FROM profiles WHERE id = ANY($1::text[])', [['a', 'b']]);

    expect(plan).toContain('profiles_pkey');
  });

  it.each([
    ['a title outside the list', "UPDATE profiles SET title = 'King'"],
    ['a gender outside the list', "UPDATE profiles SET gender = 'other'"],
    ['a date of birth before 1900', "UPDATE profiles SET date_of_birth = '1850-01-01'"],
    ['a street number out of range', 'UPDATE profiles SET street_number = 0'],
    ['a blank first name', "UPDATE profiles SET first_name = '  '"],
  ])('enforces %s even if the API were bypassed', async (_label, sql) => {
    await request(app).post('/api/profiles').send(buildProfile()).expect(201);

    await expect(pool.query(sql)).rejects.toThrow(/violates check constraint/);
  });
});
