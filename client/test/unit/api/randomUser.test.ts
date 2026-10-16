import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import { parseRandomUsers, toCountry, toTitle } from '@/api/randomUser/randomUser.mapper';
import { Gender, isCountry, Title } from '@/domain/profile';
import { fetchRandomProfiles } from '@/api/randomUser/randomUserApi';
import { rawRandomUser } from '../../fixtures/profiles';

describe('parseRandomUsers', () => {
  it('maps a randomuser.me record to a Profile', () => {
    const [profile] = parseRandomUsers([rawRandomUser('uuid-1')]);

    expect(profile).toEqual({
      id: 'uuid-1',
      name: { title: Title.Miss, first: 'Noa', last: 'Levi' },
      gender: Gender.Female,
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
      dateOfBirth: '1993-07-20',
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

  it.each([
    ['plain http', 'http://randomuser.me/api/portraits/women/2.jpg'],
    ['another host', 'https://evil.example/pixel.gif'],
    ['a look-alike host', 'https://randomuser.me.evil.example/2.jpg'],
  ])('drops a record whose portrait is %s', (_label, url) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const base = rawRandomUser('pic');
    const picture = { ...(base.picture as object), large: url };

    expect(parseRandomUsers([{ ...base, picture }])).toEqual([]);
  });

  it('drops a record with a gender outside the known set', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(parseRandomUsers([rawRandomUser('g', { gender: 'unknown' })])).toEqual([]);
  });

  it('keeps the UTC calendar day of the birth date-time', () => {
    const record = rawRandomUser('d', { dob: { date: '1990-01-01T23:30:00.000Z', age: 36 } });

    expect(parseRandomUsers([record])[0]?.dateOfBirth).toBe('1990-01-01');
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

describe('toTitle', () => {
  it.each([
    ['Mr', Title.Mr],
    [' Ms ', Title.Ms],
    ['Monsieur', Title.Mr],
    ['Madame', Title.Mrs],
    ['Mademoiselle', Title.Miss],
    ['Herr', ''],
    ['', ''],
    // Prototype keys must not leak through as titles.
    ['constructor', ''],
    ['toString', ''],
  ])('maps %j to %j', (raw, expected) => {
    expect(toTitle(raw)).toBe(expected);
  });
});

describe('toCountry', () => {
  it.each([
    ['Israel', 'Israel'],
    [' Norway ', 'Norway'],
    ['Turkey', 'Türkiye'],
    // Kept as sent, so the form flags it and the user picks a listed country.
    ['Atlantis', 'Atlantis'],
    ['constructor', 'constructor'],
  ])('maps %j to %j', (raw, expected) => {
    expect(toCountry(raw)).toBe(expected);
  });

  it('knows every country randomuser.me produces', () => {
    const randomUserCountries = [
      'Australia',
      'Brazil',
      'Canada',
      'Denmark',
      'Finland',
      'France',
      'Germany',
      'India',
      'Iran',
      'Ireland',
      'Mexico',
      'Netherlands',
      'New Zealand',
      'Norway',
      'Serbia',
      'Spain',
      'Switzerland',
      'Turkey',
      'Ukraine',
      'United Kingdom',
      'United States',
    ];
    expect(randomUserCountries.map(toCountry).filter((country) => !isCountry(country))).toEqual([]);
  });
});
