import { describe, expect, it } from 'vitest';
import { birthYear, calculateAge, formatFullName, Title } from '@/domain/profile';
import {
  distinctCountries,
  filterProfiles,
  normalizeForSearch,
  type ProfileFilter,
} from '@/domain/filter/profileFilter';
import type { Profile } from '@/domain/profile';
import { buildProfile } from '../../fixtures/profiles';

const filter = (profiles: Profile[], criteria: ProfileFilter) => filterProfiles(profiles, criteria);

describe('filterProfiles', () => {
  const john = buildProfile({ id: '1', name: { title: Title.Mr, first: 'John', last: 'Smith' } });
  const jose = buildProfile({
    id: '2',
    name: { title: Title.Mr, first: 'José', last: 'García' },
    location: { ...john.location, country: 'Spain' },
  });
  const nima = buildProfile({
    id: '3',
    name: { title: Title.Mr, first: 'نیما', last: 'رضایی' },
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
  const dob = '1990-03-15';

  it('has not had the birthday yet the day before', () => {
    expect(calculateAge(dob, new Date(2026, 2, 14))).toBe(35);
  });

  it('counts the birthday on the day itself', () => {
    expect(calculateAge(dob, new Date(2026, 2, 15))).toBe(36);
  });

  it('handles leap-day births in non-leap years', () => {
    expect(calculateAge('2000-02-29', new Date(2026, 1, 28))).toBe(25);
    expect(calculateAge('2000-02-29', new Date(2026, 2, 1))).toBe(26);
  });

  it('never goes negative', () => {
    expect(calculateAge('2026-12-31', new Date(2026, 0, 1))).toBe(0);
  });

  it('reads the birth year straight from the calendar date, whatever the timezone', () => {
    expect(birthYear('1990-12-31')).toBe(1990);
  });
});

describe('formatFullName', () => {
  it('joins title, first and last', () => {
    expect(formatFullName({ title: Title.Dr, first: 'Noa', last: 'Levi' })).toBe('Dr Noa Levi');
  });

  it('skips an empty title without leaving stray spaces', () => {
    expect(formatFullName({ title: '', first: ' Noa', last: 'Levi ' })).toBe('Noa Levi');
  });
});
