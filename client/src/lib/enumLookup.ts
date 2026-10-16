/**
 * Narrows an arbitrary string to a member of a string enum, or `undefined`. A checked
 * alternative to `value as MyEnum`, which would accept any string.
 */
export function enumLookup<T extends string>(values: readonly T[]): (value: string) => T | undefined {
  const byValue = new Map<string, T>(values.map((value) => [value, value]));
  return (value) => byValue.get(value);
}
