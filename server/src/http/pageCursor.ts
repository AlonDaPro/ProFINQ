import { z } from 'zod';
import type { PageCursor } from '../domain/pagination.js';
import { profileIdSchema } from '../domain/profile/index.js';

const cursorPayloadSchema = z
  .object({
    savedAt: z.string().datetime({ offset: true }),
    id: profileIdSchema,
  })
  .strict();

/** Opaque to clients, so the ordering behind it can change without breaking them. */
export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

/** A cursor is user input like any other: decoded, then validated. */
export const cursorParamSchema = z
  .string()
  .max(512)
  .transform((value, context) => {
    const parsed = cursorPayloadSchema.safeParse(decodeCursor(value));
    if (!parsed.success) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid cursor' });
      return z.NEVER;
    }
    return parsed.data;
  });
