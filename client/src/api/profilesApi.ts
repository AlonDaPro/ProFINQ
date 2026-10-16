import { z } from 'zod';
import { requestJson, requestNoContent } from '@/api/http';
import { PROFILES_ENDPOINT } from '@/constants/api';
import { HttpMethod } from '@/constants/http';
import { savedProfileSchema, type Profile, type ProfileName, type SavedProfile } from '@/domain/profile';

const profileListSchema = z.object({ profiles: z.array(savedProfileSchema) });

function profileUrl(id: string): string {
  return `${PROFILES_ENDPOINT}/${encodeURIComponent(id)}`;
}

export async function listSavedProfiles(): Promise<SavedProfile[]> {
  const { profiles } = await requestJson(PROFILES_ENDPOINT, profileListSchema);
  return profiles;
}

export function getSavedProfile(id: string): Promise<SavedProfile> {
  return requestJson(profileUrl(id), savedProfileSchema);
}

export function createSavedProfile(profile: Profile): Promise<SavedProfile> {
  return requestJson(PROFILES_ENDPOINT, savedProfileSchema, { method: HttpMethod.Post, body: profile });
}

export function renameSavedProfile(id: string, name: ProfileName): Promise<SavedProfile> {
  return requestJson(profileUrl(id), savedProfileSchema, { method: HttpMethod.Patch, body: { name } });
}

export function deleteSavedProfile(id: string): Promise<void> {
  return requestNoContent(profileUrl(id), { method: HttpMethod.Delete });
}
