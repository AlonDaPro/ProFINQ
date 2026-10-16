import { PERSON_ID } from '../fixtures/randomUsers';
import { expect, he, openProfile, openRandomList, profileRows, test } from '../fixtures/test';

test.describe('Screen 3: actions', () => {
  test('from Screen 1: Save persists the profile and turns Save into Delete', async ({ page, request }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    await expect(page.getByRole('button', { name: he.delete })).toHaveCount(0);

    await page.getByRole('button', { name: he.save }).click();

    await expect(page.getByText(he.savedFeedback)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/saved/${PERSON_ID.noaLevi}$`));
    await expect(page.getByText(he.savedStamp)).toBeVisible();
    await expect(page.getByRole('button', { name: he.save })).toHaveCount(0);
    await expect(page.getByRole('button', { name: he.delete })).toBeVisible();

    const saved = await request.get(`/api/profiles/${PERSON_ID.noaLevi}`);
    expect(saved.status()).toBe(200);
  });

  test('saves a real-world email that strict validators reject', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Diederich');

    await page.getByRole('button', { name: he.save }).click();

    await expect(page.getByText(he.savedFeedback)).toBeVisible();
  });

  test('Update on an unsaved profile changes the in-memory list only', async ({ page, request }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');

    await page.getByLabel(he.firstName).fill('Johnny');
    await page.getByRole('button', { name: he.update }).click();
    await expect(page.getByText(he.updatedLocal)).toBeVisible();
    await page.getByRole('button', { name: he.back }).click();

    await expect(profileRows(page).filter({ hasText: 'Mr Johnny Smith' })).toHaveCount(1);
    const { profiles } = (await (await request.get('/api/profiles')).json()) as { profiles: unknown[] };
    expect(profiles).toHaveLength(0);
  });

  test('Update on a saved profile persists to the backend', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Katrine Narum');
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();

    await page.getByLabel(he.lastName).fill('Narum-Berg');
    await page.getByLabel(he.lastName).press('Enter');
    await expect(page.getByText(he.updatedSaved)).toBeVisible();

    await page.goto('/saved');
    await expect(profileRows(page)).toContainText('Ms Katrine Narum-Berg');
  });

  test('blocks Update and Save while a required name part is empty', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');

    await page.getByLabel(he.firstName).fill('   ');

    await expect(page.getByText(he.required)).toBeVisible();
    await expect(page.getByLabel(he.firstName)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('button', { name: he.update })).toBeDisabled();
    await expect(page.getByRole('button', { name: he.save })).toBeDisabled();
  });

  test('from Screen 2: Delete asks first, then removes the profile', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Luke Kelly');
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();
    await page.goto('/saved');
    await openProfile(page, 'Luke Kelly');

    await page.getByRole('button', { name: he.delete }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toHaveAttribute('dir', 'rtl');
    await dialog.getByRole('button', { name: he.cancel }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(he.savedStamp)).toBeVisible();

    await page.getByRole('button', { name: he.delete }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: he.delete }).click();

    await expect(page).toHaveURL(/\/saved$/);
    await expect(page.getByText('No saved profiles yet.')).toBeVisible();
  });

  test('closes an open delete prompt when the user navigates away', async ({ page, request }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();

    await page.getByRole('button', { name: he.delete }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.goBack();

    await expect(page).toHaveURL(/\/random$/);
    await expect(page.getByRole('alertdialog')).toBeHidden();
    expect((await request.get(`/api/profiles/${PERSON_ID.noaLevi}`)).status()).toBe(200);
  });

  test('warns before leaving with unsaved name changes', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    await page.getByLabel(he.firstName).fill('Jon');

    await page.getByRole('button', { name: he.back }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: he.cancel }).click();
    await expect(page.getByLabel(he.firstName)).toHaveValue('Jon');

    await page.getByRole('button', { name: he.back }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: he.discard }).click();
    await expect(profileRows(page).filter({ hasText: 'Mr John Smith' })).toHaveCount(1);
  });

  test('still warns about unsaved changes after the profile was saved', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'John Smith');
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();

    await page.getByLabel(he.firstName).fill('Jon');
    await page.getByRole('button', { name: he.back }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
  });

  test('a saved profile survives a reload; an unsaved one explains it is gone', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(he.firstName)).toHaveValue('Noa');

    await page.goto(`/random/${PERSON_ID.johnSmith}`);
    await expect(page.getByRole('heading', { name: he.notFound })).toBeVisible();
  });
});

test.describe('Screen 3: bidirectional text', () => {
  test('RTL Hebrew layout with LTR data that stays LTR @mobile', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');

    const article = page.locator('article');
    await expect(article).toHaveAttribute('dir', 'rtl');
    await expect(article).toHaveAttribute('lang', 'he');
    await expect(article.getByText(he.gender, { exact: true })).toBeVisible();

    const direction = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((element) => getComputedStyle(element).direction);
    expect(await direction('article')).toBe('rtl');
    for (const control of [
      page.getByRole('combobox', { name: he.title, exact: true }),
      page.getByRole('combobox', { name: he.country, exact: true }),
      page.getByLabel(he.email),
      page.getByLabel(he.phone),
    ]) {
      expect(await control.evaluate((element) => getComputedStyle(element).direction)).toBe('ltr');
    }
    // Brackets and dashes would be reordered in an RTL context; the number must read as typed.
    await expect(page.getByLabel(he.phone)).toHaveValue('(272) 790-0888');
  });

  test('the editable Latin name behaves LTR while typing', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    const lastName = page.getByLabel(he.lastName);

    await lastName.fill('Levi');
    await lastName.press('End');
    await lastName.pressSequentially(' (Jr.)');

    await expect(lastName).toHaveValue('Levi (Jr.)');
    // Caret and neutral punctuation follow LTR rules: the brackets did not flip around.
    const caretAtEnd = await lastName.evaluate(
      (input: HTMLInputElement) => input.selectionStart === input.value.length,
    );
    expect(caretAtEnd).toBe(true);
    expect(await lastName.evaluate((input) => getComputedStyle(input).direction)).toBe('ltr');
  });

  test('a Persian name is not forced into LTR', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'نیما');

    const firstName = page.getByLabel(he.firstName);
    expect(await firstName.evaluate((input) => getComputedStyle(input).direction)).toBe('rtl');
  });

  test('the Back icon mirrors to point right in RTL', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');

    const transform = await page
      .getByRole('button', { name: he.back })
      .locator('svg')
      .evaluate((icon) => getComputedStyle(icon).transform);
    expect(transform).toBe('matrix(-1, 0, 0, 1, 0, 0)');
  });
});
