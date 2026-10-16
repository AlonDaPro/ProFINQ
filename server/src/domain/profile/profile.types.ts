import type { z } from 'zod';
import type { profileNameSchema, profileSchema } from './profile.schema.js';

export type ProfileName = z.infer<typeof profileNameSchema>;
export type Profile = z.infer<typeof profileSchema>;

export interface SavedProfile extends Profile {
  savedAt: string;
  updatedAt: string;
}
