/** Calendar date parts of a YYYY-MM-DD string. No Date object, so no timezone can shift the day. */
function dateParts(isoDate: string): { year: number; month: number; day: number } {
  const [year = 0, month = 0, day = 0] = isoDate.split('-').map(Number);
  return { year, month, day };
}

/**
 * Whole years since `dateOfBirth`, as of the viewer's local calendar day. Age is derived, never
 * stored, so a profile saved today still shows the right age next year.
 */
export function calculateAge(dateOfBirth: string, today: Date = new Date()): number {
  const birth = dateParts(dateOfBirth);
  const month = today.getMonth() + 1;
  const birthdayNotYetReached = month < birth.month || (month === birth.month && today.getDate() < birth.day);
  return Math.max(today.getFullYear() - birth.year - (birthdayNotYetReached ? 1 : 0), 0);
}

export function birthYear(dateOfBirth: string): number {
  return dateParts(dateOfBirth).year;
}
