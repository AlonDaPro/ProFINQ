import { z } from 'zod';
import { requestJson, requestNoContent } from '@/api/http';
import { COUNTRIES_ENDPOINT, PROFILES_ENDPOINT } from '@/constants/api';
import { HttpMethod } from '@/constants/http';
import type { ProfileFilter } from '@/domain/filter/profileFilter';
import { savedProfileSchema, type Profile, type ProfileDetails, type SavedProfile } from '@/domain/profile';

const profilePageSchema = z.object({
  profiles: z.array(savedProfileSchema),
  nextCursor: z.string().nullable(),
});

const countriesSchema = z.object({ countries: z.array(z.string()) });

export type ProfilePage = z.infer<typeof profilePageSchema>;

enum ProfileQueryParam {
  Cursor = 'cursor',
  Ids = 'ids',
  Name = 'name',
  Country = 'country',
}

function profileUrl(id: string): string {
  return `${PROFILES_ENDPOINT}/${encodeURIComponent(id)}`;
}

function listUrl(params: Partial<Record<ProfileQueryParam, string>>): string {
  // Empty values are left out: "no name filter" is an absent parameter, not ?name=.
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries).toString();
  return query ? `${PROFILES_ENDPOINT}?${query}` : PROFILES_ENDPOINT;
}

/**
 * One page of saved profiles, newest first, narrowed by `filter` on the server (so a filter covers
 * every saved profile, not just the loaded pages). Pass the previous page's `nextCursor` to continue.
 */
export function listSavedProfiles(filter: ProfileFilter, cursor?: string): Promise<ProfilePage> {
  return requestJson(
    listUrl({
      [ProfileQueryParam.Name]: filter.name.trim(),
      [ProfileQueryParam.Country]: filter.country,
      [ProfileQueryParam.Cursor]: cursor,
    }),
    profilePageSchema,
  );
}

/** The countries saved profiles come from: the options of History's country filter. */
export async function listSavedCountries(): Promise<string[]> {
  const { countries } = await requestJson(COUNTRIES_ENDPOINT, countriesSchema);
  return countries;
}

/** The saved profiles among `ids` (one request, however many pages the list has). */
export async function findSavedProfiles(ids: readonly string[]): Promise<SavedProfile[]> {
  if (ids.length === 0) return [];
  const { profiles } = await requestJson(listUrl({ [ProfileQueryParam.Ids]: ids.join(',') }), profilePageSchema);
  return profiles;
}

export function getSavedProfile(id: string): Promise<SavedProfile> {
  return requestJson(profileUrl(id), savedProfileSchema);
}

export function createSavedProfile(profile: Profile): Promise<SavedProfile> {
  return requestJson(PROFILES_ENDPOINT, savedProfileSchema, { method: HttpMethod.Post, body: profile });
}

/** Replaces every editable field (the server's PUT takes the complete details). */
export function updateSavedProfile(id: string, details: ProfileDetails): Promise<SavedProfile> {
  return requestJson(profileUrl(id), savedProfileSchema, { method: HttpMethod.Put, body: details });
}

export function deleteSavedProfile(id: string): Promise<void> {
  return requestNoContent(profileUrl(id), { method: HttpMethod.Delete });
}
