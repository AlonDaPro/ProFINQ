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
  STREET_NUMBER_MAX,
  STREET_NUMBER_MIN,
  parseTitle,
  type Title,
  WHOLE_NUMBER_PATTERN,
} from './profile.constants';
import { isCountry } from './countries';
import type { ProfileDetails } from './profile.types';
import { enumLookup } from '@/lib/enumLookup';

/** Every editable input on Screen 3. */
export enum FormField {
  Title = 'title',
  First = 'first',
  Last = 'last',
  Gender = 'gender',
  DateOfBirth = 'dateOfBirth',
  StreetNumber = 'streetNumber',
  StreetName = 'streetName',
  City = 'city',
  State = 'state',
  Country = 'country',
  Email = 'email',
  Phone = 'phone',
}

/** Inputs hold strings; parsing turns them into typed `ProfileDetails` or field errors. */
export type ProfileForm = Record<FormField, string>;

export enum FieldError {
  Required = 'required',
  TooLong = 'tooLong',
  UnsupportedCharacters = 'unsupportedCharacters',
  InvalidChoice = 'invalidChoice',
  InvalidName = 'invalidName',
  NoLetters = 'noLetters',
  InvalidEmail = 'invalidEmail',
  InvalidPhone = 'invalidPhone',
  NotWholeNumber = 'notWholeNumber',
  OutOfRange = 'outOfRange',
  InvalidDate = 'invalidDate',
  TooOld = 'tooOld',
  FutureDate = 'futureDate',
  /** The server rejected the value; its own message is shown. */
  Server = 'server',
}

type FieldErrors = Partial<Record<FormField, FieldError>>;

/** Input `maxlength` caps, so the browser stops typing where the server would refuse. */
export const FIELD_MAX_LENGTH: Partial<Record<FormField, number>> = {
  [FormField.First]: NAME_PART_MAX_LENGTH,
  [FormField.Last]: NAME_PART_MAX_LENGTH,
  [FormField.StreetName]: ADDRESS_PART_MAX_LENGTH,
  [FormField.City]: ADDRESS_PART_MAX_LENGTH,
  [FormField.State]: ADDRESS_PART_MAX_LENGTH,
  [FormField.Email]: EMAIL_MAX_LENGTH,
  [FormField.Phone]: PHONE_MAX_LENGTH,
};

/** Maps a server validation path (`body.location.city`) to the input it belongs to. */
export const SERVER_PATH_TO_FIELD: Readonly<Record<string, FormField>> = {
  'body.name.title': FormField.Title,
  'body.name.first': FormField.First,
  'body.name.last': FormField.Last,
  'body.gender': FormField.Gender,
  'body.dateOfBirth': FormField.DateOfBirth,
  'body.location.streetNumber': FormField.StreetNumber,
  'body.location.streetName': FormField.StreetName,
  'body.location.city': FormField.City,
  'body.location.state': FormField.State,
  'body.location.country': FormField.Country,
  'body.email': FormField.Email,
  'body.phone': FormField.Phone,
};

export function latestCalendarDate(now = Date.now()): string {
  return new Date(now + LATEST_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);
}

const text = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, FieldError.TooLong)
    .refine((value) => !FORBIDDEN_TEXT_PATTERN.test(value), FieldError.UnsupportedCharacters);

const requiredText = (maxLength: number) => text(maxLength).pipe(z.string().min(1, FieldError.Required));

const placeName = (maxLength: number) =>
  requiredText(maxLength).refine((value) => HAS_LETTER_PATTERN.test(value), FieldError.NoLetters);

const personName = requiredText(NAME_PART_MAX_LENGTH).refine(
  (value) => PERSON_NAME_PATTERN.test(value),
  FieldError.InvalidName,
);

const count = (value: string, characters: RegExp) => value.match(characters)?.length ?? 0;

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

// Each message is a FieldError code; the view turns codes into Hebrew text.
const profileFormSchema = z.object({
  [FormField.Title]: z
    .string()
    .refine((value) => value === '' || parseTitle(value) !== undefined, FieldError.InvalidChoice)
    .transform((value): Title | '' => parseTitle(value) ?? ''),
  [FormField.First]: personName,
  [FormField.Last]: personName,
  [FormField.Gender]: z.nativeEnum(Gender, { message: FieldError.InvalidChoice }),
  [FormField.DateOfBirth]: z
    .string()
    .min(1, FieldError.Required)
    .pipe(z.string().date(FieldError.InvalidDate))
    .refine((value) => value >= EARLIEST_DATE_OF_BIRTH, FieldError.TooOld)
    .refine((value) => value <= latestCalendarDate(), FieldError.FutureDate),
  [FormField.StreetNumber]: z
    .string()
    .trim()
    .min(1, FieldError.Required)
    .regex(WHOLE_NUMBER_PATTERN, FieldError.NotWholeNumber)
    .transform(Number)
    .pipe(z.number().min(STREET_NUMBER_MIN, FieldError.OutOfRange).max(STREET_NUMBER_MAX, FieldError.OutOfRange)),
  [FormField.StreetName]: placeName(ADDRESS_PART_MAX_LENGTH),
  [FormField.City]: placeName(ADDRESS_PART_MAX_LENGTH),
  [FormField.State]: text(ADDRESS_PART_MAX_LENGTH),
  [FormField.Country]: z.string().min(1, FieldError.Required).refine(isCountry, FieldError.InvalidChoice),
  [FormField.Email]: requiredText(EMAIL_MAX_LENGTH).refine(
    (value) => EMAIL_PATTERN.test(value),
    FieldError.InvalidEmail,
  ),
  [FormField.Phone]: requiredText(PHONE_MAX_LENGTH).refine(isPhoneNumber, FieldError.InvalidPhone),
});

type FormParseResult = { ok: true; details: ProfileDetails } | { ok: false; errors: FieldErrors };

const parseFieldError = enumLookup(Object.values(FieldError));
const parseFormField = enumLookup(Object.values(FormField));

/** Validates the whole form; on success returns trimmed, typed details ready to send. */
export function parseProfileForm(form: ProfileForm): FormParseResult {
  const result = profileFormSchema.safeParse(form);
  if (!result.success) {
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = parseFormField(String(issue.path[0]));
      // First problem per field wins; it is the one the user should fix first.
      if (field) errors[field] ??= parseFieldError(issue.message) ?? FieldError.Required;
    }
    return { ok: false, errors };
  }
  const values = result.data;
  return {
    ok: true,
    details: {
      name: { title: values.title, first: values.first, last: values.last },
      gender: values.gender,
      email: values.email,
      phone: values.phone,
      location: {
        streetNumber: values.streetNumber,
        streetName: values.streetName,
        city: values.city,
        state: values.state,
        country: values.country,
      },
      dateOfBirth: values.dateOfBirth,
    },
  };
}

/** The editable part of a profile, without id, picture or server timestamps. */
export function pickDetails({ name, gender, email, phone, location, dateOfBirth }: ProfileDetails): ProfileDetails {
  return { name: { ...name }, gender, email, phone, location: { ...location }, dateOfBirth };
}

export function toProfileForm(details: ProfileDetails): ProfileForm {
  return {
    [FormField.Title]: details.name.title,
    [FormField.First]: details.name.first,
    [FormField.Last]: details.name.last,
    [FormField.Gender]: details.gender,
    [FormField.DateOfBirth]: details.dateOfBirth,
    [FormField.StreetNumber]: String(details.location.streetNumber),
    [FormField.StreetName]: details.location.streetName,
    [FormField.City]: details.location.city,
    [FormField.State]: details.location.state,
    [FormField.Country]: details.location.country,
    [FormField.Email]: details.email,
    [FormField.Phone]: details.phone,
  };
}

/** Whitespace-insensitive, so trailing spaces alone never count as an unsaved change. */
export function formsEqual(a: ProfileForm, b: ProfileForm): boolean {
  return Object.values(FormField).every((field) => a[field].trim() === b[field].trim());
}
