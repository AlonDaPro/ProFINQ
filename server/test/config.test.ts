import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

describe('loadConfig', () => {
  it('applies defaults and splits CORS origins', () => {
    const config = loadConfig({ DATABASE_URL, CORS_ORIGINS: 'http://a.test, https://b.test:8443,' });

    expect(config).toEqual({
      PORT: 4000,
      DATABASE_URL,
      DB_POOL_SIZE: 10,
      CORS_ORIGINS: ['http://a.test', 'https://b.test:8443'],
      TRUST_PROXY_HOPS: 0,
      RATE_LIMIT_READS_PER_MINUTE: 300,
      RATE_LIMIT_WRITES_PER_MINUTE: 60,
    });
  });

  it('lists every problem at once', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT[\s\S]*DATABASE_URL/);
  });

  it.each(['mysql://localhost/db', 'not a url'])('rejects %j as a connection string with a readable error', (url) => {
    expect(() => loadConfig({ DATABASE_URL: url })).toThrow(/Invalid environment configuration[\s\S]*DATABASE_URL/);
  });

  it.each([
    ['an empty list', ''],
    ['a wildcard', '*'],
    ['a trailing slash', 'https://app.example.com/'],
    ['a path', 'https://app.example.com/app'],
    ['a bare host', 'app.example.com'],
  ])('rejects CORS_ORIGINS with %s, which cors would silently never match', (_label, origins) => {
    expect(() => loadConfig({ DATABASE_URL, CORS_ORIGINS: origins })).toThrow(/CORS_ORIGINS/);
  });

  it.each([
    ['DB_POOL_SIZE', '0'],
    ['DB_POOL_SIZE', '1000'],
    ['RATE_LIMIT_WRITES_PER_MINUTE', '-5'],
    ['TRUST_PROXY_HOPS', 'yes'],
  ])('rejects %s=%s', (name, value) => {
    expect(() => loadConfig({ DATABASE_URL, [name]: value })).toThrow(new RegExp(name));
  });
});
