import type { z } from 'zod';
import type { profileNameSchema, profileSchema, savedProfileSchema } from './profile.schema';

export type ProfileName = z.infer<typeof profileNameSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type SavedProfile = z.infer<typeof savedProfileSchema>;

export type NameField = keyof ProfileName;

export enum NameValidationError {
  Required = 'required',
  TooLong = 'tooLong',
}

export type NameValidationErrors = Partial<Record<NameField, NameValidationError>>;

/** randomuser.me only ever returns these two; anything else is shown as-is. */
export enum Gender {
  Male = 'male',
  Female = 'female',
}
