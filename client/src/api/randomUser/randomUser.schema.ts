import { z } from 'zod';

export const randomUserSchema = z.object({
  login: z.object({ uuid: z.string().min(1) }),
  gender: z.string(),
  name: z.object({ title: z.string(), first: z.string().min(1), last: z.string().min(1) }),
  location: z.object({
    street: z.object({ number: z.number().int().nonnegative(), name: z.string() }),
    city: z.string(),
    // randomuser.me occasionally returns numeric states for some nationalities.
    state: z.union([z.string(), z.number()]).transform(String),
    country: z.string(),
  }),
  email: z.string(),
  dob: z.object({ date: z.string().datetime({ offset: true }) }),
  phone: z.string(),
  picture: z.object({ large: z.string().url(), thumbnail: z.string().url() }),
});

export type RandomUser = z.infer<typeof randomUserSchema>;

// Records are validated one by one (see parseRandomUsers), so the envelope only checks the array.
export const randomUserResponseSchema = z.object({ results: z.array(z.unknown()) });
