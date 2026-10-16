import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import { parseRandomUsers } from '@/api/randomUser/randomUser.mapper';
import { fetchRandomProfiles } from '@/api/randomUser/randomUserApi';
import { rawRandomUser } from '../../fixtures/profiles';

describe('parseRandomUsers', () => {
  it('maps a randomuser.me record to a Profile', () => {
    const [profile] = parseRandomUsers([rawRandomUser('uuid-1')]);

    expect(profile).toEqual({
      id: 'uuid-1',
      name: { title: 'Miss', first: 'Noa', last: 'Levi' },
      gender: 'female',
      email: 'noa.levi@example.com',
      phone: '04-123-4567',
      picture: {
        large: 'https://randomuser.me/api/portraits/women/2.jpg',
        thumbnail: 'https://randomuser.me/api/portraits/thumb/women/2.jpg',
      },
      location: {
        streetNumber: 4128,
        streetName: 'Herzl St',
        city: 'Haifa',
        state: 'Haifa District',
        country: 'Israel',
      },
      dateOfBirth: '1993-07-20T09:44:18.674Z',
    });
  });

  it('drops malformed records instead of failing the whole batch', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const profiles = parseRandomUsers([
      rawRandomUser('ok-1'),
      rawRandomUser('bad', { email: undefined, picture: 'not-an-object' }),
      null,
      rawRandomUser('ok-2'),
    ]);

    expect(profiles.map((profile) => profile.id)).toEqual(['ok-1', 'ok-2']);
  });

  it('de-duplicates records that share a uuid', () => {
    expect(parseRandomUsers([rawRandomUser('same'), rawRandomUser('same')])).toHaveLength(1);
  });

  it('accepts numeric states', () => {
    const base = rawRandomUser('n');
    const location = { ...(base.location as object), state: 42 };
    expect(parseRandomUsers([{ ...base, location }])[0]?.location.state).toBe('42');
  });
});

describe('fetchRandomProfiles', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests only the fields it needs', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() =>
      Promise.resolve(Response.json({ results: [rawRandomUser('a')] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchRandomProfiles(10);

    const params = new URL(fetchMock.mock.calls[0]?.[0] ?? '').searchParams;
    expect(params.get('results')).toBe('10');
    expect(params.get('inc')).toContain('login');
  });

  it('turns an unexpected payload into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ error: 'Uh oh, something has gone wrong.' }))),
    );

    await expect(fetchRandomProfiles(10)).rejects.toThrow('The server returned unexpected data');
  });

  it('turns a network failure into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    await expect(fetchRandomProfiles(10)).rejects.toThrow('Could not reach the server');
    await expect(fetchRandomProfiles(10)).rejects.toBeInstanceOf(ApiError);
  });
});
