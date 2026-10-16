import type { Page } from '@playwright/test';
import { PERSON_ID } from '../fixtures/randomUsers';
import { expect, he, openProfile, openRandomList, profileRows, seedSavedProfiles, test } from '../fixtures/test';

const titleBox = (page: Page) => page.getByRole('combobox', { name: he.title, exact: true });
const countryBox = (page: Page) => page.getByRole('combobox', { name: he.country, exact: true });

async function pick(page: Page, box: ReturnType<typeof titleBox>, search: string, option: string): Promise<void> {
  await box.click();
  await box.fill(search);
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(box).toHaveValue(option);
}

async function saveNoaLevi(page: Page): Promise<void> {
  await openRandomList(page);
  await openProfile(page, 'Noa Levi');
  await page.getByRole('button', { name: he.save }).click();
  await expect(page.getByText(he.savedFeedback)).toBeVisible();
}

test.describe('Screen 3: editing every field', () => {
  test('edits all fields of a saved profile and stores them typed in the database', async ({ page, request }) => {
    await saveNoaLevi(page);

    await pick(page, titleBox(page), 'd', 'Dr');
    await page.getByLabel(he.firstName).fill('Noa-Lee');
    await page.getByLabel(he.lastName).fill('Levi Cohen');
    await page.getByLabel(he.gender).selectOption('male');
    await page.getByLabel(he.dateOfBirth).fill('1985-05-04');
    await page.getByLabel(he.streetNumber).fill('42');
    await page.getByLabel(he.street, { exact: true }).fill('Herzl');
    await page.getByLabel(he.city).fill('Haifa');
    await page.getByLabel(he.state).fill('');
    await pick(page, countryBox(page), 'isr', 'Israel');
    await page.getByLabel(he.email).fill('noa.cohen@example.co.il');
    await page.getByLabel(he.phone).fill('+972 58-604-3122');
    await page.getByRole('button', { name: he.update }).click();
    await expect(page.getByText(he.updatedSaved)).toBeVisible();

    const stored = (await (await request.get(`/api/profiles/${PERSON_ID.noaLevi}`)).json()) as Record<string, unknown>;
    expect(stored).toMatchObject({
      name: { title: 'Dr', first: 'Noa-Lee', last: 'Levi Cohen' },
      gender: 'male',
      dateOfBirth: '1985-05-04',
      location: { streetNumber: 42, streetName: 'Herzl', city: 'Haifa', state: '', country: 'Israel' },
      email: 'noa.cohen@example.co.il',
      phone: '+972 58-604-3122',
    });

    await page.reload();
    await expect(titleBox(page)).toHaveValue('Dr');
    await expect(countryBox(page)).toHaveValue('Israel');
    await expect(page.getByLabel(he.dateOfBirth)).toHaveValue('1985-05-04');
    await expect(page.getByLabel(he.phone)).toHaveValue('+972 58-604-3122');
  });

  test('the title can be cleared, and an empty title is saved as none', async ({ page, request }) => {
    await saveNoaLevi(page);

    await page.getByRole('button', { name: he.clearTitle }).click();
    await expect(titleBox(page)).toHaveValue('');
    await page.getByRole('button', { name: he.update }).click();
    await expect(page.getByText(he.updatedSaved)).toBeVisible();

    const stored = (await (await request.get(`/api/profiles/${PERSON_ID.noaLevi}`)).json()) as {
      name: { title: string };
    };
    expect(stored.name.title).toBe('');
  });

  test('a country can only be picked from the list, never typed in', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');

    await countryBox(page).click();
    await countryBox(page).fill('Atlantis');
    await expect(page.getByText('אין ארץ כזו')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByLabel(he.city).click();

    await expect(countryBox(page)).toHaveValue('United States');
    await expect(countryBox(page)).not.toHaveAttribute('aria-invalid');

    // Search ignores accents and case.
    await pick(page, countryBox(page), 'cote', 'Côte d’Ivoire');
  });

  test('randomuser.me\'s "Turkey" is shown under its listed name', async ({ page }) => {
    await openRandomList(page);
    await expect(profileRows(page).filter({ hasText: 'Begüm' })).toContainText('Türkiye');
    await openProfile(page, 'Begüm');
    await expect(countryBox(page)).toHaveValue('Türkiye');
  });
});

test.describe('Screen 3: validation', () => {
  test('shows each error in Hebrew on its field and blocks Save until it is fixed', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    const save = page.getByRole('button', { name: he.save });
    const update = page.getByRole('button', { name: he.update });

    for (const [label, value, message] of [
      [he.email, 'john@example', he.invalidEmail],
      [he.phone, '12-34', he.invalidPhone],
      [he.streetNumber, '12a', he.notWholeNumber],
      [he.firstName, 'J0hn', he.invalidName],
    ] as const) {
      const input = page.getByLabel(label);
      const original = await input.inputValue();

      await input.fill(value);
      await expect(page.getByText(message)).toBeVisible();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText(he.invalidFormOne)).toBeVisible();
      await expect(save).toBeDisabled();
      await expect(update).toBeDisabled();

      await input.fill(original);
      await expect(input).not.toHaveAttribute('aria-invalid');
      await expect(save).toBeEnabled();
    }
  });

  test('pressing Enter in an invalid form submits nothing', async ({ page, request }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');

    await page.getByLabel(he.email).fill('not an email');
    await page.getByLabel(he.email).press('Enter');

    await expect(page.getByText(he.savedFeedback)).toHaveCount(0);
    expect((await request.get(`/api/profiles/${PERSON_ID.johnSmith}`)).status()).toBe(404);
  });

  test('accepts phone numbers in every common format', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    const phone = page.getByLabel(he.phone);

    for (const number of [
      '0586043122',
      '058-6043122',
      '+972586043122',
      '+972 58-604-3122',
      '00972 58 604 3122',
      '(058) 604-3122',
      '030/1234567',
      '058.604.3122',
      '+1 (555) 123-4567 ext. 89',
      '1-800-FLOWERS',
    ]) {
      await phone.fill(number);
      await expect(phone, number).not.toHaveAttribute('aria-invalid');
    }
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();
  });

  test('maps a server rejection onto the field it is about', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    await page.route('**/api/profiles', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            json: {
              error: {
                code: 'VALIDATION_FAILED',
                message: 'Request validation failed',
                details: [{ path: 'body.email', message: 'Email domain is not accepted' }],
              },
            },
          })
        : route.fallback(),
    );

    await page.getByRole('button', { name: he.save }).click();

    await expect(page.getByText(he.fixFields)).toBeVisible();
    await expect(page.getByText('Email domain is not accepted')).toBeVisible();
    await expect(page.getByLabel(he.email)).toHaveAttribute('aria-invalid', 'true');
  });

  test('explains a rate limit (429) instead of a generic failure', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    await page.route('**/api/profiles', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 429,
            json: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, try again later' } },
          })
        : route.fallback(),
    );

    await page.getByRole('button', { name: he.save }).click();

    await expect(page.getByText(he.tooManyRequests)).toBeVisible();
    await expect(page.getByRole('button', { name: he.save })).toBeEnabled();
  });

  test('leaving while a save is in flight stays on the list the user went back to', async ({ page, request }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    let releaseSave!: () => void;
    const saveHeld = new Promise<void>((resolve) => (releaseSave = resolve));
    await page.route('**/api/profiles', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await saveHeld;
      return route.fallback();
    });

    await page.getByRole('button', { name: he.save }).click();
    await page.goBack();
    await expect(page).toHaveURL(/\/random$/);
    releaseSave();

    await expect.poll(async () => (await request.get(`/api/profiles/${PERSON_ID.johnSmith}`)).status()).toBe(200);
    await expect(page).toHaveURL(/\/random$/);
    await expect(profileRows(page).filter({ hasText: 'John Smith' })).toContainText('Saved');
  });
});

test.describe('Screen 2: pagination', () => {
  test('loads saved profiles a page at a time', async ({ page, request }) => {
    await seedSavedProfiles(request, 25);

    await page.goto('/saved');
    await expect(profileRows(page)).toHaveCount(20);
    await page.getByRole('button', { name: 'Show more' }).click();

    await expect(profileRows(page)).toHaveCount(25);
    await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
    // Newest first: the last seeded profile heads the list.
    await expect(profileRows(page).first()).toContainText('seed24@example.com');
  });

  test('marks rows of a new random batch that are already in the database', async ({ page }) => {
    await saveNoaLevi(page);

    // A reload empties the client state: the badge can only come from the batched ids lookup.
    await page.goto('/');
    await page.reload();
    await openRandomList(page);

    await expect(profileRows(page).filter({ hasText: 'Saved' })).toHaveCount(1);
    await expect(profileRows(page).filter({ hasText: 'Noa Levi' })).toContainText('Saved');
  });
});
