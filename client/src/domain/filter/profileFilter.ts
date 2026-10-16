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

/** A profile paired with its normalized name, so normalization runs once per data change, not per keystroke. */
export interface SearchEntry<T extends Profile> {
  profile: T;
  searchableName: string;
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

export function isFilterActive(filter: ProfileFilter): boolean {
  return filter.name.trim().length > 0 || filter.country.length > 0;
}

export function buildSearchIndex<T extends Profile>(profiles: readonly T[]): SearchEntry<T>[] {
  return profiles.map((profile) => ({ profile, searchableName: normalizeForSearch(formatFullName(profile.name)) }));
}

/**
 * Every typed word must appear somewhere in the full name, in any order:
 * "smith john" and "john smith" both match "Mr John Smith".
 */
export function filterProfiles<T extends Profile>(index: readonly SearchEntry<T>[], filter: ProfileFilter): T[] {
  const nameTokens = tokenize(filter.name);
  const { country } = filter;
  const matches: T[] = [];
  for (const { profile, searchableName } of index) {
    if (country && profile.location.country !== country) continue;
    if (nameTokens.every((token) => searchableName.includes(token))) matches.push(profile);
  }
  return matches;
}

export function distinctCountries(profiles: readonly Profile[]): string[] {
  const countries = new Set(profiles.map((profile) => profile.location.country));
  return [...countries].sort((a, b) => a.localeCompare(b));
}
