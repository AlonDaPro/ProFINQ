import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { isDatabaseUnavailableError, waitForDatabase } from '../src/db/pool.js';

const withCode = (code: string) => Object.assign(new Error('db error'), { code });

describe('isDatabaseUnavailableError', () => {
  it.each([
    ['a refused connection', withCode('ECONNREFUSED')],
    ['a statement timeout', withCode('57014')],
    ['a server restart mid-query', new Error('Connection terminated unexpectedly')],
    ['a pool checkout timeout', new Error('timeout exceeded when trying to connect')],
  ])('treats %s as unavailable (503)', (_label, error) => {
    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it.each([
    ['a unique violation', withCode('23505')],
    ['a plain bug', new TypeError('x is undefined')],
    ['a non-error value', 'boom'],
  ])('does not treat %s as unavailable', (_label, error) => {
    expect(isDatabaseUnavailableError(error)).toBe(false);
  });
});

describe('waitForDatabase', () => {
  const fakePool = (errors: Error[]) => {
    let calls = 0;
    const pool = {
      query: () => {
        const error = errors[calls++];
        return error === undefined ? Promise.resolve() : Promise.reject(error);
      },
    };
    return { pool: pool as unknown as Pool, calls: () => calls };
  };

  it('retries while the database is unavailable, then succeeds', async () => {
    const { pool, calls } = fakePool([withCode('ECONNREFUSED'), withCode('57P03')]);

    await waitForDatabase(pool, { attempts: 5, delayMs: 0 });

    expect(calls()).toBe(3);
  });

  it('fails at once on errors that waiting cannot fix, such as a wrong password', async () => {
    const { pool, calls } = fakePool([withCode('28P01')]);

    await expect(waitForDatabase(pool, { attempts: 5, delayMs: 0 })).rejects.toMatchObject({ code: '28P01' });
    expect(calls()).toBe(1);
  });

  it('gives up after the last attempt', async () => {
    const { pool } = fakePool(Array.from({ length: 3 }, () => withCode('ECONNREFUSED')));

    await expect(waitForDatabase(pool, { attempts: 3, delayMs: 0 })).rejects.toThrow(/unreachable after 3 attempts/);
  });
});
