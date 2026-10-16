import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

describe('loadConfig', () => {
  it('applies defaults and splits CORS origins', () => {
    const config = loadConfig({ DATABASE_URL, CORS_ORIGINS: 'http://a.test, http://b.test,' });

    expect(config).toEqual({ PORT: 4000, DATABASE_URL, CORS_ORIGINS: ['http://a.test', 'http://b.test'] });
  });

  it('lists every problem at once', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT[\s\S]*DATABASE_URL/);
  });

  it.each(['mysql://localhost/db', 'not a url'])('rejects %j as a connection string with a readable error', (url) => {
    expect(() => loadConfig({ DATABASE_URL: url })).toThrow(/Invalid environment configuration[\s\S]*DATABASE_URL/);
  });
});
