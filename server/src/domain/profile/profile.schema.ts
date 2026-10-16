import { z } from 'zod';
import {
  ADDRESS_PART_MAX_LENGTH,
  BALANCED_BRACKETS_PATTERN,
  EARLIEST_DATE_OF_BIRTH,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  FORBIDDEN_TEXT_PATTERN,
  Gender,
  HAS_LETTER_PATTERN,
  LATEST_TIMEZONE_OFFSET_MS,
  NAME_PART_MAX_LENGTH,
  PERSON_NAME_PATTERN,
  PHONE_MAX_DIALABLE,
  PHONE_MAX_LENGTH,
  PHONE_MIN_DIALABLE,
  PHONE_MIN_DIGITS,
  PHONE_PATTERN,
  PICTURE_HOST,
  PROFILE_ID_MAX_LENGTH,
  PROFILE_ID_PATTERN,
  SECURE_URL_PROTOCOL,
  STREET_NUMBER_MAX,
  STREET_NUMBER_MIN,
  Title,
  URL_MAX_LENGTH,
} from './profile.constants.js';
import { isCountry } from './countries.js';

const text = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .refine((value) => !FORBIDDEN_TEXT_PATTERN.test(value), `${fieldName} contains unsupported characters`);

const requiredText = (fieldName: string, maxLength: number) =>
  text(fieldName, maxLength).refine((value) => value.length > 0, `${fieldName} is required`);

/** Place names must contain at least one letter, so "!!!" or "123" is not a city. */
const placeName = (fieldName: string, maxLength: number) =>
  requiredText(fieldName, maxLength).refine(
    (value) => HAS_LETTER_PATTERN.test(value),
    `${fieldName} must contain letters`,
  );

const personName = (fieldName: string) =>
  requiredText(fieldName, NAME_PART_MAX_LENGTH).refine(
    (value) => PERSON_NAME_PATTERN.test(value),
    `${fieldName} may only contain letters, spaces, apostrophes, dots and hyphens`,
  );

const count = (value: string, characters: RegExp) => value.match(characters)?.length ?? 0;

/**
 * Format-agnostic on purpose: a per-country check (libphonenumber) would reject randomuser.me's
 * synthetic numbers and any number typed without its country code for a different country.
 */
const isPhoneNumber = (value: string) => {
  const dialable = count(value, /[\dA-Za-z]/g);
  return (
    PHONE_PATTERN.test(value) &&
    BALANCED_BRACKETS_PATTERN.test(value) &&
    count(value, /\d/g) >= PHONE_MIN_DIGITS &&
    dialable >= PHONE_MIN_DIALABLE &&
    dialable <= PHONE_MAX_DIALABLE
  );
};

// Picture URLs are rendered straight into <img src>; only plain https portraits from randomuser.me
// are accepted, so javascript:/data: payloads and tracking pixels never reach the database. The
// normalized href is what gets stored: the parser forgives things (surrounding spaces) the check
// should not pass through verbatim.
const pictureUrl = z
  .string()
  .max(URL_MAX_LENGTH)
  .refine((value) => !FORBIDDEN_TEXT_PATTERN.test(value) && URL.canParse(value), 'Must be a valid URL')
  .transform((value) => new URL(value))
  .refine(
    (url) =>
      url.protocol === SECURE_URL_PROTOCOL &&
      url.hostname === PICTURE_HOST &&
      url.port === '' &&
      url.username === '' &&
      url.password === '',
    `Must be an https URL on ${PICTURE_HOST}`,
  )
  .transform((url) => url.href);

/** Today's calendar date in the furthest-ahead timezone, so no real birthday is "in the future". */
const latestCalendarDate = () => new Date(Date.now() + LATEST_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);

// A birthday is a calendar day (YYYY-MM-DD), not an instant, so no timezone can shift it.
// ISO dates compare correctly as strings.
const dateOfBirth = z
  .string()
  .date('Date of birth must be a YYYY-MM-DD date')
  .refine((value) => value >= EARLIEST_DATE_OF_BIRTH, 'Date of birth is too far in the past')
  .refine((value) => value <= latestCalendarDate(), 'Date of birth cannot be in the future');

// No .trim(): an id is a key, so " abc " must be rejected rather than silently become "abc".
export const profileIdSchema = z
  .string()
  .min(1)
  .max(PROFILE_ID_MAX_LENGTH)
  .regex(PROFILE_ID_PATTERN, 'Profile id may only contain letters, digits and dashes');

/** Everything a user can edit on Screen 3. Unknown keys are rejected, never silently dropped. */
export const profileDetailsSchema = z
  .object({
    name: z
      .object({
        title: z.union([z.literal(''), z.nativeEnum(Title)], { message: 'Title must be one of the listed titles' }),
        first: personName('First name'),
        last: personName('Last name'),
      })
      .strict(),
    gender: z.nativeEnum(Gender, { message: 'Gender must be male or female' }),
    email: requiredText('Email', EMAIL_MAX_LENGTH).refine((value) => EMAIL_PATTERN.test(value), 'Invalid email'),
    phone: requiredText('Phone', PHONE_MAX_LENGTH).refine(
      isPhoneNumber,
      `Phone must have ${PHONE_MIN_DIALABLE}-${PHONE_MAX_DIALABLE} digits or letters, with only spaces and ( ) - . / between them`,
    ),
    location: z
      .object({
        // A JSON number, not a numeric string: "12" is a type error, not a street number.
        streetNumber: z
          .number({ invalid_type_error: 'Street number must be a number' })
          .int('Street number must be a whole number')
          .min(STREET_NUMBER_MIN)
          .max(STREET_NUMBER_MAX),
        streetName: placeName('Street name', ADDRESS_PART_MAX_LENGTH),
        city: placeName('City', ADDRESS_PART_MAX_LENGTH),
        // Some randomuser.me regions are numeric codes, so a state may be digits or empty.
        state: text('State', ADDRESS_PART_MAX_LENGTH),
        country: z.string().refine(isCountry, 'Country must be one of the listed countries'),
      })
      .strict(),
    dateOfBirth,
  })
  .strict();

export const profileSchema = profileDetailsSchema
  .extend({
    id: profileIdSchema,
    picture: z.object({ large: pictureUrl, thumbnail: pictureUrl }).strict(),
  })
  .strict();
