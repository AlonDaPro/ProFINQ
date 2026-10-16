/**
 * Age is derived from the stored date of birth at render time rather than
 * persisted, so a profile saved today still shows the right age next year.
 * UTC is used throughout so the result does not depend on the viewer's timezone.
 */
export function calculateAge(dateOfBirthIso: string, now: Date = new Date()): number {
  const birth = new Date(dateOfBirthIso);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayNotYetReached =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (birthdayNotYetReached) age -= 1;
  return Math.max(age, 0);
}

export function birthYear(dateOfBirthIso: string): number {
  return new Date(dateOfBirthIso).getUTCFullYear();
}
