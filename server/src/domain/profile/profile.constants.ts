/** Honorifics a profile may carry. A closed set, so the database can enforce it too (migration 1). */
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

/** randomuser.me only produces these two. */
export enum Gender {
  Male = 'male',
  Female = 'female',
}

export const PROFILE_ID_MAX_LENGTH = 64;
export const NAME_PART_MAX_LENGTH = 50;
/** RFC 5321 limit for a forward path. */
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 40;
/** Dialable characters: digits, plus letters, which a keypad maps to digits. */
export const PHONE_MIN_DIALABLE = 5;
/** E.164 allows 15 digits; the rest leaves room for an extension ("ext. 123"). */
export const PHONE_MAX_DIALABLE = 20;
/** Even a vanity number ("1-800-FLOWERS") has a few real digits. */
export const PHONE_MIN_DIGITS = 3;
export const URL_MAX_LENGTH = 2048;
export const ADDRESS_PART_MAX_LENGTH = 200;
export const STREET_NUMBER_MIN = 1;
export const STREET_NUMBER_MAX = 99_999;
/** Keeps every derived age between 0 and ~125. */
export const EARLIEST_DATE_OF_BIRTH = '1900-01-01';
/** UTC+14 (Kiribati) is the furthest-ahead timezone: someone there may already be on tomorrow's date. */
export const LATEST_TIMEZONE_OFFSET_MS = 14 * 60 * 60 * 1000;

export const PROFILE_ID_PATTERN = /^[A-Za-z0-9-]+$/;
/**
 * A person's name: starts with a letter; then letters, combining marks, spaces, apostrophes
 * (' and ’), hyphens and dots ("Hans-J.", "O'Neil", "da Paz"), plus ZWNJ/ZWJ (U+200C/U+200D),
 * which Persian names use.
 */
export const PERSON_NAME_PATTERN = /^\p{L}(?:[\p{L}\p{M}' .\u{2019}-]|\u{200C}|\u{200D})*$/u;
/**
 * Deliberately loose on the local part: real randomuser.me records such as
 * "hans-j..diederich@example.com" fail strict RFC checks. We require local@domain.tld.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
/**
 * A phone number as people write it, in any country's format: an optional leading "+", then digits
 * and Latin letters with spaces, dots, dashes, slashes or brackets between them ("058-6043122",
 * "+972 (58) 604-3122", "030/1234567", "1-800-FLOWERS", "+1 555 123 4567 ext. 89"). It starts with
 * a digit, letter or "(" and ends with a digit or letter. Letters stay allowed: vanity numbers are
 * real, and randomuser.me issues letter-bearing numbers for some countries (CA, UA).
 */
export const PHONE_PATTERN = /^\+?[\dA-Za-z(](?:[\dA-Za-z\s()./-]*[\dA-Za-z])?$/;
/** Brackets, if any, come in non-nested pairs: "(58) 604" yes, "((58) 604" or "58) 604" no. */
export const BALANCED_BRACKETS_PATTERN = /^[^()]*(?:\([^()]*\)[^()]*)*$/;
export const HAS_LETTER_PATTERN = /\p{L}/u;
/**
 * Control characters, and the Unicode BiDi embedding/override/isolate controls. The latter can
 * make stored text display in a different order than it is stored (the "Trojan Source" trick),
 * which matters in an app that mixes Hebrew and Latin. ZWJ/ZWNJ stay allowed: Persian needs them.
 */
export const FORBIDDEN_TEXT_PATTERN = /[\p{Cc}\u{202A}-\u{202E}\u{2066}-\u{2069}]/u;

export const SECURE_URL_PROTOCOL = 'https:';
/** Pictures are only ever randomuser.me portraits; any other host is refused. */
export const PICTURE_HOST = 'randomuser.me';
