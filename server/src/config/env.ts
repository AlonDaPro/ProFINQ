import { z } from 'zod';

const DEFAULT_PORT = 4000;
const MAX_PORT = 65_535;
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173';
const POSTGRES_PROTOCOLS: ReadonlySet<string> = new Set(['postgres:', 'postgresql:']);
const DEFAULT_DB_POOL_SIZE = 10;
const MAX_DB_POOL_SIZE = 100;
const DEFAULT_READS_PER_MINUTE = 300;
const DEFAULT_WRITES_PER_MINUTE = 60;

/** `cors` compares origins by exact string, so "https://a.com/" or "*" would silently match nothing. */
const isExactOrigin = (value: string) => URL.canParse(value) && new URL(value).origin === value;

const positiveInt = (fallback: number, max = Number.MAX_SAFE_INTEGER) =>
  z.coerce.number().int().min(1).max(max).default(fallback);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required (see .env.example)' })
    .refine(
      (value) => URL.canParse(value) && POSTGRES_PROTOCOLS.has(new URL(value).protocol),
      'DATABASE_URL must be a postgres:// connection string',
    ),
  DB_POOL_SIZE: positiveInt(DEFAULT_DB_POOL_SIZE, MAX_DB_POOL_SIZE),
  CORS_ORIGINS: z
    .string()
    .default(DEFAULT_CORS_ORIGINS)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .refine((origins) => origins.length > 0, 'CORS_ORIGINS must list at least one origin')
    .refine(
      (origins) => origins.every(isExactOrigin),
      'CORS_ORIGINS entries must be exact origins like https://app.example.com (no path, no trailing slash, no *)',
    ),
  /** Proxy hops to trust for the client IP (rate limiting). 0 locally; 1 behind one load balancer. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_READS_PER_MINUTE: positiveInt(DEFAULT_READS_PER_MINUTE),
  RATE_LIMIT_WRITES_PER_MINUTE: positiveInt(DEFAULT_WRITES_PER_MINUTE),
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
