import { requestJson } from '@/api/http';
import { RANDOM_USER_ENDPOINT, RANDOM_USER_FIELDS, RandomUserParam } from '@/constants/api';
import type { Profile } from '@/domain/profile';
import { parseRandomUsers } from './randomUser.mapper';
import { randomUserResponseSchema } from './randomUser.schema';

export async function fetchRandomProfiles(count: number, signal?: AbortSignal): Promise<Profile[]> {
  const url = new URL(RANDOM_USER_ENDPOINT);
  url.searchParams.set(RandomUserParam.Results, String(count));
  url.searchParams.set(RandomUserParam.Include, RANDOM_USER_FIELDS.join(','));
  url.searchParams.set(RandomUserParam.NoInfo, '');

  const { results } = await requestJson(url.toString(), randomUserResponseSchema, { signal });
  return parseRandomUsers(results);
}
