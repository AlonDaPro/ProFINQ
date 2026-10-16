import { describe, expect, it } from 'vitest';
import {
  FieldError,
  FormField,
  formsEqual,
  Gender,
  latestCalendarDate,
  parseProfileForm,
  pickDetails,
  Title,
  toProfileForm,
  type ProfileForm,
} from '@/domain/profile';
import { buildProfile, buildSavedProfile } from '../../fixtures/profiles';

const validForm = (): ProfileForm => toProfileForm(buildProfile());

function errorFor(field: FormField, value: string): FieldError | undefined {
  const result = parseProfileForm({ ...validForm(), [field]: value });
  return result.ok ? undefined : result.errors[field];
}

describe('parseProfileForm', () => {
  it('turns a valid form into typed, trimmed details', () => {
    const result = parseProfileForm({
      ...validForm(),
      [FormField.First]: '  Johnny ',
      [FormField.StreetNumber]: ' 42 ',
    });

    expect(result).toEqual({
      ok: true,
      details: {
        ...pickDetails(buildProfile()),
        name: { ...buildProfile().name, first: 'Johnny' },
        location: { ...buildProfile().location, streetNumber: 42 },
      },
    });
  });

  it('turns the street number into a number, not a numeric string', () => {
    const result = parseProfileForm({ ...validForm(), [FormField.StreetNumber]: '007' });

    expect(result.ok && result.details.location.streetNumber).toBe(7);
  });

  it.each([
    [FormField.Title, ''],
    [FormField.Title, Title.Dr],
    [FormField.First, 'Hans-J.'],
    [FormField.Last, "O'Neil"],
    [FormField.Last, 'da Paz'],
    [FormField.First, 'נועה'],
    [FormField.Gender, Gender.Female],
    [FormField.Email, 'hans-j..diederich@example.com'],
    [FormField.Phone, '0586043122'],
    [FormField.Phone, '058-6043122'],
    [FormField.Phone, '+972586043122'],
    [FormField.Phone, '+972 (58) 604-3122'],
    [FormField.Phone, '1-800-FLOWERS'],
    [FormField.Phone, '00972586043122'],
    [FormField.Phone, '030/1234567'],
    [FormField.Phone, '(058) 604-3122'],
    [FormField.Phone, '+1 555 123 4567 ext. 89'],
    [FormField.Phone, 'B64 K21-6427'],
    [FormField.Country, 'Israel'],
    [FormField.Country, 'Côte d’Ivoire'],
    [FormField.State, ''],
    [FormField.State, '42'],
    [FormField.DateOfBirth, '1900-01-01'],
  ])('accepts %s = %j', (field, value) => {
    expect(errorFor(field, value)).toBeUndefined();
  });

  it.each([
    [FormField.Title, 'King', FieldError.InvalidChoice],
    [FormField.First, '', FieldError.Required],
    [FormField.First, '   ', FieldError.Required],
    [FormField.First, 'N0a', FieldError.InvalidName],
    [FormField.Last, '!!!', FieldError.InvalidName],
    [FormField.Last, 'a'.repeat(51), FieldError.TooLong],
    [FormField.Gender, 'other', FieldError.InvalidChoice],
    [FormField.DateOfBirth, '', FieldError.Required],
    [FormField.DateOfBirth, '1993-02-30', FieldError.InvalidDate],
    [FormField.DateOfBirth, '1899-12-31', FieldError.TooOld],
    [FormField.DateOfBirth, '2999-01-01', FieldError.FutureDate],
    [FormField.StreetNumber, '', FieldError.Required],
    [FormField.StreetNumber, '12a', FieldError.NotWholeNumber],
    [FormField.StreetNumber, '-5', FieldError.NotWholeNumber],
    [FormField.StreetNumber, '1.5', FieldError.NotWholeNumber],
    [FormField.StreetNumber, '0', FieldError.OutOfRange],
    [FormField.StreetNumber, '100000', FieldError.OutOfRange],
    [FormField.StreetName, '123', FieldError.NoLetters],
    [FormField.City, '', FieldError.Required],
    [FormField.Country, '', FieldError.Required],
    [FormField.Country, 'Isreal', FieldError.InvalidChoice],
    [FormField.Country, 'Turkey', FieldError.InvalidChoice],
    [FormField.Email, 'noa@example', FieldError.InvalidEmail],
    [FormField.Email, 'noa levi@example.com', FieldError.InvalidEmail],
    [FormField.Phone, '12-34', FieldError.InvalidPhone],
    [FormField.Phone, '054*123#4567', FieldError.InvalidPhone],
    [FormField.Phone, '1'.repeat(21), FieldError.InvalidPhone],
    [FormField.Phone, '-0586043122', FieldError.InvalidPhone],
    [FormField.Phone, '0586043122.', FieldError.InvalidPhone],
    [FormField.Phone, '+972+586043122', FieldError.InvalidPhone],
    [FormField.Phone, '+972 (58 604-3122', FieldError.InvalidPhone],
    [FormField.Phone, 'CALL-ME-1', FieldError.InvalidPhone],
    [FormField.City, `Haifa${String.fromCodePoint(0x202e)}`, FieldError.UnsupportedCharacters],
  ])('rejects %s = %j with %s', (field, value, expected) => {
    expect(errorFor(field, value)).toBe(expected);
  });

  it('reports every invalid field at once, one error each', () => {
    const result = parseProfileForm({ ...validForm(), [FormField.First]: '', [FormField.Email]: 'nope' });

    expect(result).toEqual({
      ok: false,
      errors: { [FormField.First]: FieldError.Required, [FormField.Email]: FieldError.InvalidEmail },
    });
  });
});

describe('toProfileForm / formsEqual', () => {
  it('round-trips details through the form unchanged', () => {
    const result = parseProfileForm(toProfileForm(buildSavedProfile()));

    expect(result).toEqual({ ok: true, details: pickDetails(buildSavedProfile()) });
  });

  it('ignores surrounding whitespace when comparing forms', () => {
    expect(formsEqual(validForm(), { ...validForm(), [FormField.City]: ' Billings ' })).toBe(true);
    expect(formsEqual(validForm(), { ...validForm(), [FormField.City]: 'Austin' })).toBe(false);
  });

  it('keeps id, picture and timestamps out of the editable details', () => {
    expect(Object.keys(pickDetails(buildSavedProfile())).sort()).toEqual(
      ['dateOfBirth', 'email', 'gender', 'location', 'name', 'phone'].sort(),
    );
  });
});

describe('latestCalendarDate', () => {
  it('is a day ahead of UTC late in the UTC day, for people already in tomorrow (UTC+14)', () => {
    expect(latestCalendarDate(Date.UTC(2026, 0, 1, 12))).toBe('2026-01-02');
    expect(latestCalendarDate(Date.UTC(2026, 0, 1, 1))).toBe('2026-01-01');
  });
});
