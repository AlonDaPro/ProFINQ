import { enumLookup } from '@/lib/enumLookup';

// Mirrors server/src/domain/profile/profile.constants.ts. The server is the authority; this copy
// lets the form reject bad input before a round trip. Keep the two in step.

export enum Title {
  Mr = 'Mr',
  Mrs = 'Mrs',
  Ms = 'Ms',
  Miss = 'Miss',
  Dr = 'Dr',
  Master = 'Master',
  Rev = 'Rev',
  Sir = 'Sir',
  Mx = 'Mx',
}

export const parseTitle = enumLookup(Object.values(Title));

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export const NAME_PART_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 40;
export const PHONE_MIN_DIALABLE = 5;
export const PHONE_MAX_DIALABLE = 20;
export const PHONE_MIN_DIGITS = 3;
export const ADDRESS_PART_MAX_LENGTH = 200;
export const STREET_NUMBER_MIN = 1;
export const STREET_NUMBER_MAX = 99_999;
export const EARLIEST_DATE_OF_BIRTH = '1900-01-01';
/** UTC+14 is the furthest-ahead timezone: someone there may already be on tomorrow's date. */
export const LATEST_TIMEZONE_OFFSET_MS = 14 * 60 * 60 * 1000;

export const PERSON_NAME_PATTERN = /^\p{L}(?:[\p{L}\p{M}' .\u{2019}-]|\u{200C}|\u{200D})*$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const PHONE_PATTERN = /^\+?[\dA-Za-z(](?:[\dA-Za-z\s()./-]*[\dA-Za-z])?$/;
export const BALANCED_BRACKETS_PATTERN = /^[^()]*(?:\([^()]*\)[^()]*)*$/;
export const HAS_LETTER_PATTERN = /\p{L}/u;
export const WHOLE_NUMBER_PATTERN = /^\d+$/;
/** Control characters and BiDi embedding/override/isolate controls (see the server constants). */
export const FORBIDDEN_TEXT_PATTERN = /[\p{Cc}\u{202A}-\u{202E}\u{2066}-\u{2069}]/u;

export const PICTURE_HOST = 'randomuser.me';
