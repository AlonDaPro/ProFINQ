import { isCountry, parseTitle, Title, type Profile } from '@/domain/profile';
import { randomUserSchema, type RandomUser } from './randomUser.schema';

/** randomuser.me's French titles, mapped onto the closed set the API accepts. A Map, so untrusted keys
 * like "constructor" cannot reach Object.prototype. */
const TITLE_ALIASES: ReadonlyMap<string, Title> = new Map([
  ['Monsieur', Title.Mr],
  ['Madame', Title.Mrs],
  ['Mademoiselle', Title.Miss],
]);

/** Unknown titles become empty rather than failing the record: the title is optional. */
export function toTitle(raw: string): Title | '' {
  const trimmed = raw.trim();
  return parseTitle(trimmed) ?? TITLE_ALIASES.get(trimmed) ?? '';
}

/** randomuser.me names that differ from the CLDR names the API accepts. */
const COUNTRY_ALIASES: ReadonlyMap<string, string> = new Map([['Turkey', 'Türkiye']]);

/** An unknown country is kept as sent: the form then flags it, and the user picks one from the list. */
export function toCountry(raw: string): string {
  const trimmed = raw.trim();
  return isCountry(trimmed) ? trimmed : (COUNTRY_ALIASES.get(trimmed) ?? trimmed);
}

/** The only place that knows randomuser.me's shape; the rest of the app speaks `Profile`. */
function toProfile(user: RandomUser): Profile {
  return {
    id: user.login.uuid,
    name: { title: toTitle(user.name.title), first: user.name.first, last: user.name.last },
    gender: user.gender,
    email: user.email,
    phone: user.phone,
    picture: { large: user.picture.large, thumbnail: user.picture.thumbnail },
    location: {
      streetNumber: user.location.street.number,
      streetName: user.location.street.name,
      city: user.location.city,
      state: user.location.state,
      country: toCountry(user.location.country),
    },
    // A birthday is a calendar day; randomuser.me sends an instant, whose UTC date we keep.
    dateOfBirth: user.dob.date.slice(0, 10),
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
