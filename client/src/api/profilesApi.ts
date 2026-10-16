import { z } from 'zod';
import { requestJson, requestNoContent } from '@/api/http';
import { PROFILES_ENDPOINT } from '@/constants/api';
import { HttpMethod } from '@/constants/http';
import { savedProfileSchema, type Profile, type ProfileDetails, type SavedProfile } from '@/domain/profile';

const profilePageSchema = z.object({
  profiles: z.array(savedProfileSchema),
  nextCursor: z.string().nullable(),
});

export type ProfilePage = z.infer<typeof profilePageSchema>;

enum ProfileQueryParam {
  Cursor = 'cursor',
  Ids = 'ids',
}

function profileUrl(id: string): string {
  return `${PROFILES_ENDPOINT}/${encodeURIComponent(id)}`;
}

function listUrl(params: Partial<Record<ProfileQueryParam, string>>): string {
  const query = new URLSearchParams(params).toString();
  return query ? `${PROFILES_ENDPOINT}?${query}` : PROFILES_ENDPOINT;
}

/** One page of saved profiles, newest first. Pass the previous page's `nextCursor` to continue. */
export function listSavedProfiles(cursor?: string): Promise<ProfilePage> {
  return requestJson(listUrl(cursor ? { [ProfileQueryParam.Cursor]: cursor } : {}), profilePageSchema);
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
