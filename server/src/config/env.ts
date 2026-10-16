import { z } from 'zod';

const DEFAULT_PORT = 4000;
const MAX_PORT = 65_535;
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173';
const POSTGRES_PROTOCOLS: ReadonlySet<string> = new Set(['postgres:', 'postgresql:']);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required (see .env.example)' })
    .url('DATABASE_URL must be a postgres:// connection string')
    .refine(
      (value) => URL.canParse(value) && POSTGRES_PROTOCOLS.has(new URL(value).protocol),
      'DATABASE_URL must use postgres://',
    ),
  CORS_ORIGINS: z
    .string()
    .default(DEFAULT_CORS_ORIGINS)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

export type AppConfig = z.infer<typeof envSchema>;

/** Fails fast at boot with every problem listed, instead of crashing later on first use. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}
