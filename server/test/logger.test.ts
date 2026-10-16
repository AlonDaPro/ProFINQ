import { describe, expect, it } from 'vitest';
import { describeError } from '../src/logger.js';

describe('describeError', () => {
  it('keeps name, code, message and stack, and follows the cause chain', () => {
    const cause = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });

    expect(describeError(new Error('Migration failed', { cause }))).toEqual({
      name: 'Error',
      message: 'Migration failed',
      stack: expect.stringContaining('Migration failed'),
      cause: { name: 'Error', message: 'connection refused', code: 'ECONNREFUSED', stack: expect.any(String) },
    });
  });

  it('drops fields that can carry personal data, such as a Postgres error detail', () => {
    const pgError = Object.assign(new Error('violates check constraint'), {
      code: '23514',
      detail: 'Failing row contains (noa.levi@example.com, 054-1234567)',
    });

    expect(JSON.stringify(describeError(pgError))).not.toContain('noa.levi@example.com');
  });

  it('describes non-Error values', () => {
    expect(describeError('boom')).toEqual({ value: 'boom' });
  });
});
