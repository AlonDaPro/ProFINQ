import type { z } from 'zod';
import type { profileDetailsSchema, profileNameSchema, profileSchema, savedProfileSchema } from './profile.schema';

export type ProfileName = z.infer<typeof profileNameSchema>;
/** Everything a user can edit on Screen 3. */
export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type SavedProfile = z.infer<typeof savedProfileSchema>;
