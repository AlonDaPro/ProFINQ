import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });

export const profileNameSchema = z.object({
  title: z.string(),
  first: z.string(),
  last: z.string(),
});

/** The client's view of a profile. Validates what the API returns; the server owns the business rules. */
export const profileSchema = z.object({
  id: z.string().min(1),
  name: profileNameSchema,
  gender: z.string(),
  email: z.string(),
  phone: z.string(),
  picture: z.object({ large: z.string().url(), thumbnail: z.string().url() }),
  location: z.object({
    streetNumber: z.number().int(),
    streetName: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
  }),
  dateOfBirth: isoDateTime,
});

export const savedProfileSchema = profileSchema.extend({
  savedAt: isoDateTime,
  updatedAt: isoDateTime,
});
