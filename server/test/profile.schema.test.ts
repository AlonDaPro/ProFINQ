import { describe, expect, it } from 'vitest';
import { COUNTRIES, profileDetailsSchema, profileSchema } from '../src/domain/profile/index.js';
import { buildDetails, buildProfile, withValue } from './helpers.js';

// Built at runtime so no invisible character ever sits in this source file.
const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);
const ZERO_WIDTH_NON_JOINER = String.fromCodePoint(0x200c);

function issuesFor(body: unknown): string[] {
  const result = profileDetailsSchema.safeParse(body);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('profileDetailsSchema: accepts real-world data', () => {
  it.each([
    ['a Latin name with a hyphen and dot', 'name.first', 'Hans-J.'],
    ['an apostrophe', 'name.last', "O'Neil"],
    ['a typographic apostrophe', 'name.last', 'O’Neil'],
    ['a multi-word surname', 'name.last', 'da Paz'],
    ['accents', 'name.first', 'José'],
    ['Hebrew', 'name.first', 'נועה'],
    ['Persian with a zero-width non-joiner', 'name.first', `ما${ZERO_WIDTH_NON_JOINER}ه`],
    ['an empty title', 'name.title', ''],
    ['a double-dot email local part', 'email', 'hans-j..diederich@example.com'],
    ['a vanity phone number', 'phone', '1-800-FLOWERS'],
    ['a letter-bearing randomuser.me phone', 'phone', '(068) W85-9024'],
    ['an international phone', 'phone', '+972 54-123-4567'],
    ['a plain Israeli mobile', 'phone', '0586043122'],
    ['a dashed Israeli mobile', 'phone', '058-6043122'],
    ['an E.164 number', 'phone', '+972586043122'],
    ['a number with an area code in brackets', 'phone', '+972 (58) 604-3122'],
    ['a dotted number', 'phone', '058.604.3122'],
    ['an extension', 'phone', '03-1234567 ext 12'],
    ['an international prefix with 00', 'phone', '00972586043122'],
    ['a slash-separated number', 'phone', '030/1234567'],
    ['a national number with a bracketed area code', 'phone', '(058) 604-3122'],
    ['a US number with a short extension', 'phone', '+1 (555) 123-4567 x89'],
    ['a letter-bearing randomuser.me number (CA)', 'phone', 'B64 K21-6427'],
    ['a letter-bearing randomuser.me number (UA)', 'phone', '(066) K60-1834'],
    ['a listed country', 'location.country', 'Israel'],
    ['a country with diacritics', 'location.country', 'Türkiye'],
    ['a country with a typographic apostrophe', 'location.country', 'Côte d’Ivoire'],
    ['the earliest allowed birthday', 'dateOfBirth', '1900-01-01'],
    ['a numeric state code', 'location.state', '42'],
    ['an empty state', 'location.state', ''],
  ])('%s', (_label, path, value) => {
    expect(issuesFor(withValue(buildDetails(), path, value))).toEqual([]);
  });

  it('trims surrounding whitespace', () => {
    const parsed = profileDetailsSchema.parse(withValue(buildDetails(), 'name.first', '  Noa  '));
    expect(parsed.name.first).toBe('Noa');
  });
});

describe('profileDetailsSchema: rejects bad or hostile input', () => {
  it.each([
    ['a title outside the list', 'name.title', 'King'],
    ['a null title', 'name.title', null],
    ['a blank first name', 'name.first', '   '],
    ['digits in a first name', 'name.first', 'N0a'],
    ['symbols in a last name', 'name.last', '!!!'],
    ['markup in a name', 'name.first', '<script>alert(1)</script>'],
    ['a name that is too long', 'name.first', 'a'.repeat(51)],
    ['a BiDi override in a name', 'name.first', `Noa${RIGHT_TO_LEFT_OVERRIDE}ivel`],
    ['a control character in a city', 'location.city', 'Bill\u0000ings'],
    ['a gender outside the list', 'gender', 'other'],
    ['an email without a domain dot', 'email', 'noa@example'],
    ['an email with spaces', 'email', 'noa levi@example.com'],
    ['a phone with too few digits', 'phone', '12-34'],
    ['a phone with too many digits', 'phone', '1'.repeat(21)],
    ['a phone with symbols', 'phone', '054*123#4567'],
    ['a phone starting with a separator', 'phone', '-0586043122'],
    ['a phone ending with a separator', 'phone', '0586043122-'],
    ['a phone with a plus in the middle', 'phone', '+972+586043122'],
    ['a phone with an unclosed bracket', 'phone', '+972 (58 604-3122'],
    ['a phone with nested brackets', 'phone', '((058)) 604-3122'],
    ['a phone that is mostly letters', 'phone', 'CALL-ME-1'],
    ['a street number sent as a string', 'location.streetNumber', '8929'],
    ['a fractional street number', 'location.streetNumber', 12.5],
    ['a zero street number', 'location.streetNumber', 0],
    ['a street number that is too large', 'location.streetNumber', 100_000],
    ['a city without letters', 'location.city', '12345'],
    ['an empty country', 'location.country', ''],
    ['a misspelled country', 'location.country', 'Isreal'],
    ['a country in the wrong case', 'location.country', 'israel'],
    ['a country padded with spaces', 'location.country', ' Israel'],
    ['a date that is not ISO 8601', 'dateOfBirth', '20/07/1993'],
    ['a date-time instead of a calendar date', 'dateOfBirth', '1993-07-20T09:44:18.674Z'],
    ['an impossible date', 'dateOfBirth', '1993-02-30'],
    ['a future date of birth', 'dateOfBirth', '2999-01-01'],
    ['a date of birth before 1900', 'dateOfBirth', '1899-12-31'],
  ])('%s', (_label, path, value) => {
    expect(issuesFor(withValue(buildDetails(), path, value))).toContain(path);
  });

  it.each([
    ['at the top level', { ...buildDetails(), isAdmin: true }],
    ['inside name', withValue(buildDetails(), 'name.middle', 'X')],
    ['inside location', withValue(buildDetails(), 'location.postcode', '12345')],
  ])('rejects unknown keys %s instead of silently dropping them', (_label, body) => {
    expect(profileDetailsSchema.safeParse(body).success).toBe(false);
  });

  it('does not let the details payload change the id or the picture', () => {
    const body = { ...buildDetails(), id: 'other-id', picture: buildProfile().picture };
    expect(profileDetailsSchema.safeParse(body).success).toBe(false);
  });
});

describe('profileSchema: id', () => {
  it.each([
    ['surrounding whitespace', ' abc '],
    ['a dot', 'abc.def'],
    ['a quote', "x'; DROP TABLE profiles; --"],
    ['an empty string', ''],
    ['more than 64 characters', 'a'.repeat(65)],
  ])('rejects %s instead of rewriting it', (_label, id) => {
    expect(profileSchema.safeParse({ ...buildProfile(), id }).success).toBe(false);
  });
});

describe('profileSchema: pictures', () => {
  it.each([
    ['plain http', 'http://randomuser.me/api/portraits/women/1.jpg'],
    ['another host', 'https://evil.example/pixel.gif'],
    ['a look-alike host', 'https://randomuser.me.evil.example/1.jpg'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:image/png;base64,AAAA'],
    ['not a URL at all', 'nope'],
    ['a URL with credentials', 'https://user:pw@randomuser.me/api/portraits/women/1.jpg'],
    ['a URL with a port', 'https://randomuser.me:8443/api/portraits/women/1.jpg'],
    ['a URL with a NUL character', 'https://randomuser.me/api/portraits/women/1\u0000.jpg'],
  ])('rejects %s', (_label, url) => {
    const result = profileSchema.safeParse(withValue(buildProfile(), 'picture.large', url));
    expect(result.success).toBe(false);
  });

  it('accepts randomuser.me portraits over https', () => {
    expect(profileSchema.safeParse(buildProfile()).success).toBe(true);
  });

  it('stores the normalized URL, not the raw input', () => {
    const raw = '  https://RandomUser.me/api/portraits/women/1.jpg';
    const parsed = profileSchema.parse(withValue(buildProfile(), 'picture.large', raw));
    expect(parsed.picture.large).toBe('https://randomuser.me/api/portraits/women/1.jpg');
  });
});

describe('COUNTRIES', () => {
  it('lists every ISO 3166-1 country once, alphabetically', () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
    expect([...COUNTRIES].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(COUNTRIES);
  });
});
