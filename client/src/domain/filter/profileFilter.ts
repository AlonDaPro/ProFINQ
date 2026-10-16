import { formatFullName, type Profile } from '@/domain/profile';

export interface ProfileFilter {
  name: string;
  country: string;
}

/** The URL query keys the filter is stored under (`?name=…&country=…`). */
export enum FilterQueryKey {
  Name = 'name',
  Country = 'country',
}

export const EMPTY_FILTER: Readonly<ProfileFilter> = Object.freeze({ name: '', country: '' });

const WHITESPACE = /\s+/;

/** Case- and accent-insensitive, so "jose" finds "José" and "OZ" finds "Öz". */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeForSearch(value)
    .split(WHITESPACE)
    .filter((token) => token.length > 0);
}

/** Whitespace around the name does not make a different filter. */
export function sameFilter(a: ProfileFilter, b: ProfileFilter): boolean {
  return a.name.trim() === b.name.trim() && a.country === b.country;
}

export function isFilterActive(filter: ProfileFilter): boolean {
  return filter.name.trim().length > 0 || filter.country.length > 0;
}

/**
 * Every typed word must appear somewhere in the full name, in any order:
 * "smith john" and "john smith" both match "Mr John Smith".
 */
export function filterProfiles<T extends Profile>(profiles: readonly T[], filter: ProfileFilter): T[] {
  const nameTokens = tokenize(filter.name);
  return profiles.filter((profile) => {
    if (filter.country && profile.location.country !== filter.country) return false;
    const searchableName = normalizeForSearch(formatFullName(profile.name));
    return nameTokens.every((token) => searchableName.includes(token));
  });
}

export function distinctCountries(profiles: readonly Profile[]): string[] {
  const countries = new Set(profiles.map((profile) => profile.location.country));
  return [...countries].sort((a, b) => a.localeCompare(b));
}
