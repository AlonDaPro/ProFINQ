import type { z } from 'zod';
import type { profileDetailsSchema, profileSchema } from './profile.schema.js';

/** The editable part of a profile. */
export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
export type Profile = z.infer<typeof profileSchema>;

export interface SavedProfile extends Profile {
  savedAt: string;
  updatedAt: string;
}
