import { z } from 'zod';
import {
  ADDRESS_PART_MAX_LENGTH,
  COUNTRY_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  EMAIL_SHAPE_PATTERN,
  GENDER_MAX_LENGTH,
  NAME_PART_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  PROFILE_ID_MAX_LENGTH,
  PROFILE_ID_PATTERN,
  SECURE_URL_PROTOCOL,
  TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from './profile.constants.js';

const requiredText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`);

// Picture URLs are rendered straight into <img src>, so only https is accepted
// to keep javascript:/data: payloads and mixed content out of the database.
const httpsUrl = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH)
  .url()
  // zod still runs refinements after .url() fails, so parse defensively: a bad URL must be a 400, not a throw.
  .refine((value) => URL.canParse(value) && new URL(value).protocol === SECURE_URL_PROTOCOL, 'Must be an https URL');

export const profileIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(PROFILE_ID_MAX_LENGTH)
  .regex(PROFILE_ID_PATTERN, 'Profile id may only contain letters, digits and dashes');

export const profileNameSchema = z
  .object({
    title: z.string().trim().max(TITLE_MAX_LENGTH),
    first: requiredText('First name', NAME_PART_MAX_LENGTH),
    last: requiredText('Last name', NAME_PART_MAX_LENGTH),
  })
  .strict();

export const profileSchema = z
  .object({
    id: profileIdSchema,
    name: profileNameSchema,
    gender: requiredText('Gender', GENDER_MAX_LENGTH),
    email: requiredText('Email', EMAIL_MAX_LENGTH).regex(EMAIL_SHAPE_PATTERN, 'Invalid email'),
    phone: requiredText('Phone', PHONE_MAX_LENGTH),
    picture: z.object({ large: httpsUrl, thumbnail: httpsUrl }).strict(),
    location: z
      .object({
        streetNumber: z.number().int().nonnegative(),
        streetName: requiredText('Street name', ADDRESS_PART_MAX_LENGTH),
        city: requiredText('City', ADDRESS_PART_MAX_LENGTH),
        state: z.string().trim().max(ADDRESS_PART_MAX_LENGTH),
        country: requiredText('Country', COUNTRY_MAX_LENGTH),
      })
      .strict(),
    dateOfBirth: z
      .string()
      .datetime({ offset: true })
      .refine((value) => Date.parse(value) <= Date.now(), 'Date of birth cannot be in the future'),
  })
  .strict();

export const updateProfileNameSchema = z.object({ name: profileNameSchema }).strict();
