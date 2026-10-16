import { z } from 'zod';
import { Gender, Title } from './profile.constants';

const isoDateTime = z.string().datetime({ offset: true });

/** Validates what the API returns: the shape and the closed sets. The server owns the business rules. */
export const profileNameSchema = z.object({
  title: z.union([z.literal(''), z.nativeEnum(Title)]),
  first: z.string(),
  last: z.string(),
});

export const profileDetailsSchema = z.object({
  name: profileNameSchema,
  gender: z.nativeEnum(Gender),
  email: z.string(),
  phone: z.string(),
  location: z.object({
    streetNumber: z.number().int(),
    streetName: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
  }),
  /** A calendar date, YYYY-MM-DD. */
  dateOfBirth: z.string().date(),
});

export const profileSchema = profileDetailsSchema.extend({
  id: z.string().min(1),
  picture: z.object({ large: z.string().url(), thumbnail: z.string().url() }),
});

export const savedProfileSchema = profileSchema.extend({
  savedAt: isoDateTime,
  updatedAt: isoDateTime,
});
