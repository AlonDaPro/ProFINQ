import { Gender, Title, type Profile, type SavedProfile } from '@/domain/profile';

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'b1c2d3e4-0000-4000-8000-000000000001',
    name: { title: Title.Mr, first: 'John', last: 'Smith' },
    gender: Gender.Male,
    email: 'john.smith@example.com',
    phone: '(272) 790-0888',
    picture: {
      large: 'https://randomuser.me/api/portraits/men/1.jpg',
      thumbnail: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
    },
    location: {
      streetNumber: 8929,
      streetName: 'Valwood Pkwy',
      city: 'Billings',
      state: 'Michigan',
      country: 'United States',
    },
    dateOfBirth: '1990-03-15',
    ...overrides,
  };
}

export function buildSavedProfile(overrides: Partial<SavedProfile> = {}): SavedProfile {
  return {
    ...buildProfile(),
    savedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A raw record exactly as randomuser.me returns it with `inc=gender,name,location,email,login,dob,phone,picture`. */
export function rawRandomUser(uuid: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gender: 'female',
    name: { title: 'Miss', first: 'Noa', last: 'Levi' },
    location: {
      street: { number: 4128, name: 'Herzl St' },
      city: 'Haifa',
      state: 'Haifa District',
      country: 'Israel',
      postcode: 31000,
      coordinates: { latitude: '0', longitude: '0' },
      timezone: { offset: '+2:00', description: 'Jerusalem' },
    },
    email: 'noa.levi@example.com',
    login: { uuid, username: 'bluefish42' },
    dob: { date: '1993-07-20T09:44:18.674Z', age: 33 },
    phone: '04-123-4567',
    picture: {
      large: 'https://randomuser.me/api/portraits/women/2.jpg',
      medium: 'https://randomuser.me/api/portraits/med/women/2.jpg',
      thumbnail: 'https://randomuser.me/api/portraits/thumb/women/2.jpg',
    },
    ...overrides,
  };
}
