import { describe, expect, it } from 'vitest';
import { birthYear, calculateAge, formatFullName, namesEqual, validateName } from '@/domain/profile';
import {
  buildSearchIndex,
  distinctCountries,
  filterProfiles,
  normalizeForSearch,
  type ProfileFilter,
} from '@/domain/filter/profileFilter';
import type { Profile } from '@/domain/profile';
import { buildProfile } from '../../fixtures/profiles';

const filter = (profiles: Profile[], criteria: ProfileFilter) => filterProfiles(buildSearchIndex(profiles), criteria);

describe('filterProfiles', () => {
  const john = buildProfile({ id: '1', name: { title: 'Mr', first: 'John', last: 'Smith' } });
  const jose = buildProfile({
    id: '2',
    name: { title: 'Mr', first: 'José', last: 'García' },
    location: { ...john.location, country: 'Spain' },
  });
  const nima = buildProfile({
    id: '3',
    name: { title: 'آقای', first: 'نیما', last: 'رضایی' },
    location: { ...john.location, country: 'Iran' },
  });
  const all = [john, jose, nima];

  it('returns everything for an empty filter', () => {
    expect(filter(all, { name: '   ', country: '' })).toEqual(all);
  });

  it('matches name words in any order, case-insensitively', () => {
    expect(filter(all, { name: 'SMITH john', country: '' })).toEqual([john]);
  });

  it('ignores accents in both the query and the data', () => {
    expect(filter(all, { name: 'jose garcia', country: '' })).toEqual([jose]);
  });

  it('matches non-Latin names', () => {
    expect(filter(all, { name: 'نیما', country: '' })).toEqual([nima]);
  });

  it('combines name and country', () => {
    expect(filter(all, { name: 'john', country: 'Spain' })).toEqual([]);
    expect(filter(all, { name: '', country: 'Spain' })).toEqual([jose]);
  });

  it('lists distinct countries alphabetically', () => {
    expect(distinctCountries([...all, john])).toEqual(['Iran', 'Spain', 'United States']);
  });

  it('normalizes search text', () => {
    expect(normalizeForSearch('  Çağlar ÖZ ')).toBe('caglar oz');
  });
});

describe('calculateAge', () => {
  const dob = '1990-03-15T10:00:00.000Z';

  it('has not had the birthday yet the day before', () => {
    expect(calculateAge(dob, new Date('2026-03-14T23:00:00Z'))).toBe(35);
  });

  it('counts the birthday on the day itself', () => {
    expect(calculateAge(dob, new Date('2026-03-15T00:00:00Z'))).toBe(36);
  });

  it('handles leap-day births in non-leap years', () => {
    expect(calculateAge('2000-02-29T00:00:00Z', new Date('2026-02-28T12:00:00Z'))).toBe(25);
    expect(calculateAge('2000-02-29T00:00:00Z', new Date('2026-03-01T00:00:00Z'))).toBe(26);
  });

  it('reads the birth year in UTC', () => {
    expect(birthYear('1990-12-31T23:30:00.000Z')).toBe(1990);
  });
});

describe('name helpers', () => {
  it('formats a full name without stray spaces when the title is empty', () => {
    expect(formatFullName({ title: '', first: 'Noa', last: 'Levi' })).toBe('Noa Levi');
  });

  it('treats whitespace-only differences as equal', () => {
    expect(namesEqual({ title: 'Ms', first: ' Noa', last: 'Levi ' }, { title: 'Ms', first: 'Noa', last: 'Levi' })).toBe(
      true,
    );
  });

  it('requires first and last names and caps lengths', () => {
    expect(validateName({ title: '', first: '  ', last: 'x'.repeat(51) })).toEqual({
      first: 'required',
      last: 'tooLong',
    });
    expect(validateName({ title: 'Dr', first: 'A', last: 'B' })).toEqual({});
  });
});
