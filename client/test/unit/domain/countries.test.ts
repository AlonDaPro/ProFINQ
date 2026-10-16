// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '@/domain/profile';

const CLIENT_COUNTRIES_FILE = new URL('../../../src/domain/profile/countries.ts', import.meta.url);
const SERVER_COUNTRIES_FILE = new URL('../../../../server/src/domain/profile/countries.ts', import.meta.url);

/** The list literal as written in a countries.ts source file. */
function countryListSource(file: URL): string {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('export const COUNTRIES');
  return source.slice(start, source.indexOf('];', start));
}

describe('COUNTRIES', () => {
  it('is the same list the server validates against', () => {
    expect(countryListSource(CLIENT_COUNTRIES_FILE)).toBe(countryListSource(SERVER_COUNTRIES_FILE));
  });

  it('lists every ISO 3166-1 country once', () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
  });
});
