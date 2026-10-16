const DEFAULT_API_BASE_URL = '/api';
const TRAILING_SLASHES = /\/+$/;

/** In development `/api` is proxied by Vite; a deployed build can point at an absolute URL. `||`: an empty value also means the default. */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(TRAILING_SLASHES, '');

export const PROFILES_ENDPOINT = `${API_BASE_URL}/profiles`;

export const RANDOM_USER_ENDPOINT = 'https://randomuser.me/api/';

/** Only the fields the app renders, which keeps the randomuser.me payload small. */
export const RANDOM_USER_FIELDS = ['gender', 'name', 'location', 'email', 'login', 'dob', 'phone', 'picture'] as const;

export enum RandomUserParam {
  Results = 'results',
  Include = 'inc',
  NoInfo = 'noinfo',
}
