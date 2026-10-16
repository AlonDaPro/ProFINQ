// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as client from '@/domain/profile/profile.constants';
import * as server from '../../../../server/src/domain/profile/profile.constants';

// The client repeats the server's validation rules so the form can answer before a round trip.
// These tests fail the moment the two copies drift apart.

const SHARED_VALUES = [
  'NAME_PART_MAX_LENGTH',
  'EMAIL_MAX_LENGTH',
  'PHONE_MAX_LENGTH',
  'PHONE_MIN_DIALABLE',
  'PHONE_MAX_DIALABLE',
  'PHONE_MIN_DIGITS',
  'ADDRESS_PART_MAX_LENGTH',
  'STREET_NUMBER_MIN',
  'STREET_NUMBER_MAX',
  'EARLIEST_DATE_OF_BIRTH',
  'LATEST_TIMEZONE_OFFSET_MS',
  'PICTURE_HOST',
] as const;

const SHARED_PATTERNS = [
  'PERSON_NAME_PATTERN',
  'EMAIL_PATTERN',
  'PHONE_PATTERN',
  'BALANCED_BRACKETS_PATTERN',
  'HAS_LETTER_PATTERN',
  'FORBIDDEN_TEXT_PATTERN',
] as const;

/** The list literal as written in a countries.ts source file. */
function countryListSource(file: URL): string {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('export const COUNTRIES');
  return source.slice(start, source.indexOf('];', start));
}

describe('validation rules match the server', () => {
  it.each(SHARED_VALUES)('%s', (name) => {
    expect(client[name]).toBe(server[name]);
  });

  it.each(SHARED_PATTERNS)('%s', (name) => {
    expect(client[name].source).toBe(server[name].source);
    expect(client[name].flags).toBe(server[name].flags);
  });

  it('Title and Gender', () => {
    expect(Object.values(client.Title)).toEqual(Object.values(server.Title));
    expect(Object.values(client.Gender)).toEqual(Object.values(server.Gender));
  });

  it('the country list', () => {
    const clientFile = new URL('../../../src/domain/profile/countries.ts', import.meta.url);
    const serverFile = new URL('../../../../server/src/domain/profile/countries.ts', import.meta.url);
    expect(countryListSource(clientFile)).toBe(countryListSource(serverFile));
  });
});
