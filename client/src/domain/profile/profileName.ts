import { NAME_PART_MAX_LENGTH, TITLE_MAX_LENGTH } from './profile.constants';
import { NameValidationError, type NameField, type NameValidationErrors, type ProfileName } from './profile.types';

export const NAME_FIELDS: readonly NameField[] = ['title', 'first', 'last'];

export const NAME_FIELD_MAX_LENGTH: Readonly<Record<NameField, number>> = {
  title: TITLE_MAX_LENGTH,
  first: NAME_PART_MAX_LENGTH,
  last: NAME_PART_MAX_LENGTH,
};

export const REQUIRED_NAME_FIELDS: ReadonlySet<NameField> = new Set(['first', 'last']);

/** "Mr John Smith": title + first + last, skipping empty parts. */
export function formatFullName({ title, first, last }: ProfileName): string {
  return [title, first, last]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
}

export function normalizeName(name: ProfileName): ProfileName {
  return { title: name.title.trim(), first: name.first.trim(), last: name.last.trim() };
}

export function namesEqual(a: ProfileName, b: ProfileName): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return NAME_FIELDS.every((field) => left[field] === right[field]);
}

/** Mirrors the server's rules so the user gets feedback before a round trip. */
export function validateName(name: ProfileName): NameValidationErrors {
  const normalized = normalizeName(name);
  const errors: NameValidationErrors = {};
  for (const field of NAME_FIELDS) {
    const value = normalized[field];
    if (REQUIRED_NAME_FIELDS.has(field) && value.length === 0) errors[field] = NameValidationError.Required;
    else if (value.length > NAME_FIELD_MAX_LENGTH[field]) errors[field] = NameValidationError.TooLong;
  }
  return errors;
}
