import { describe, expect, it } from 'vitest';
import { isDatabaseUnavailableError } from '../src/db/pool.js';

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
