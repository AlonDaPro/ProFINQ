import type { ProfileName } from './profile.types';

/** "Mr John Smith": title + first + last, skipping empty parts. */
export function formatFullName({ title, first, last }: ProfileName): string {
  return [title, first, last]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
}
