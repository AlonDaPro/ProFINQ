import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, requestJson } from '@/api/http';

const anySchema = z.unknown();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestJson', () => {
  it('uses the server error message and status from the error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ error: { code: 'X', message: 'Nope' } }, { status: 409 }))),
    );

    await expect(requestJson('/api/x', anySchema)).rejects.toMatchObject({ message: 'Nope', status: 409 });
  });

  it('carries the field details of a validation error, and names them in the message', async () => {
    const details = [{ path: 'body.email', message: 'Invalid email' }];
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { error: { code: 'VALIDATION_FAILED', message: 'Request validation failed', details } },
            { status: 400 },
          ),
        ),
      ),
    );

    await expect(requestJson('/api/x', anySchema)).rejects.toMatchObject({
      status: 400,
      details,
      message: 'Request validation failed (body.email: Invalid email)',
    });
  });

  it('keeps caller cancellation an AbortError even when it lands while the body is read', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => {
            controller.abort();
            return Promise.reject(abortError);
          },
        }),
      ),
    );

    const result = requestJson('/api/x', anySchema, { signal: controller.signal });

    await expect(result).rejects.toBe(abortError);
    await expect(result).rejects.not.toBeInstanceOf(ApiError);
  });
});
