import type { Profile } from '@/domain/profile';
import { randomUserSchema, type RandomUser } from './randomUser.schema';

/** The only place that knows randomuser.me's shape; the rest of the app speaks `Profile`. */
function toProfile(user: RandomUser): Profile {
  return {
    id: user.login.uuid,
    name: { title: user.name.title, first: user.name.first, last: user.name.last },
    gender: user.gender,
    email: user.email,
    phone: user.phone,
    picture: { large: user.picture.large, thumbnail: user.picture.thumbnail },
    location: {
      streetNumber: user.location.street.number,
      streetName: user.location.street.name,
      city: user.location.city,
      state: user.location.state,
      country: user.location.country,
    },
    dateOfBirth: user.dob.date,
  };
}

/** Drops malformed records (instead of failing the whole batch) and duplicate ids. */
export function parseRandomUsers(results: readonly unknown[]): Profile[] {
  const profilesById = new Map<string, Profile>();
  for (const raw of results) {
    const parsed = randomUserSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('Skipping malformed randomuser.me record', parsed.error.issues);
      continue;
    }
    const profile = toProfile(parsed.data);
    if (!profilesById.has(profile.id)) profilesById.set(profile.id, profile);
  }
  return [...profilesById.values()];
}
