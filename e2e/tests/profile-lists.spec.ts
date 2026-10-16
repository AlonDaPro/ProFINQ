import {
  EXPECTS_HTTP_ERRORS,
  expect,
  he,
  openProfile,
  openRandomList,
  profileRows,
  RANDOM_USER_API,
  stubRandomUser,
  test,
} from '../fixtures/test';

test.describe('Screen 1: random list', () => {
  test('shows thumbnail, full name, gender, country, phone and email for each of the 10 people', async ({ page }) => {
    await openRandomList(page);

    const row = profileRows(page).filter({ hasText: 'Mr José García' });
    // Decorative (alt=""), so it has no img role: the name beside it already says who this is.
    await expect(row.locator('img')).toHaveAttribute('src', /portraits\/thumb\//);
    for (const value of ['Male', 'Spain', '928-519-794', 'jose.garcia@example.com']) {
      await expect(row).toContainText(value);
    }
  });

  test('filters by name in any order, ignoring case and accents', async ({ page }) => {
    await openRandomList(page);
    const nameFilter = page.getByRole('searchbox', { name: 'Name' });

    await nameFilter.fill('GARCIA jose');
    await expect(profileRows(page)).toHaveCount(1);
    await expect(profileRows(page)).toContainText('José García');

    await nameFilter.fill('نیما');
    await expect(profileRows(page)).toContainText('نیما');
  });

  test('combines name and country filters, and can clear them', async ({ page }) => {
    await openRandomList(page);
    const country = page.getByRole('combobox', { name: 'Country' });

    await country.selectOption('United States');
    await expect(profileRows(page)).toHaveCount(2);
    await expect(page.getByRole('status').filter({ hasText: '2 of 10' })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Name' }).fill('zzz');
    await expect(page.getByText('No one matches these filters.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(profileRows(page)).toHaveCount(10);
    await expect(country).toHaveValue('');
  });

  test('keeps the filter in the URL across the detail screen, Back and reload', async ({ page }) => {
    await openRandomList(page);
    await page.getByRole('searchbox', { name: 'Name' }).fill('smith');
    await expect(page).toHaveURL(/\?name=smith/);

    await openProfile(page, 'John Smith');
    await page.getByRole('button', { name: he.back }).click();

    await expect(page.getByRole('searchbox', { name: 'Name' })).toHaveValue('smith');
    await expect(profileRows(page)).toHaveCount(1);

    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Name' })).toHaveValue('smith');
    await expect(profileRows(page)).toHaveCount(1);
  });

  test('shows an error with a working retry when randomuser.me fails', EXPECTS_HTTP_ERRORS, async ({ page }) => {
    await page.unroute(RANDOM_USER_API);
    await page.route(RANDOM_USER_API, (route) => route.fulfill({ status: 503, body: 'down' }));
    await page.goto('/random');
    await expect(page.getByRole('alert')).toContainText('Request failed with status 503');

    await page.unroute(RANDOM_USER_API);
    await stubRandomUser(page);
    await page.getByRole('button', { name: 'Try again' }).click();

    await expect(profileRows(page)).toHaveCount(10);
  });

  test('stacks each row into a readable card on a phone @mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The stacked layout only exists on a phone');
    await openRandomList(page);

    const row = profileRows(page).first();
    // Shown as a real label, not as screen-reader-only text (which is clipped to 1px).
    const label = await row.getByText('Email', { exact: true }).boundingBox();
    expect(label?.width).toBeGreaterThan(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Screen 2: saved profiles', () => {
  test('lists saved people with the same row layout and filters', async ({ page }) => {
    await openRandomList(page);
    for (const name of ['Noa Levi', 'Luke Kelly']) {
      await openProfile(page, name);
      await page.getByRole('button', { name: he.save }).click();
      await expect(page.getByText(he.savedFeedback)).toBeVisible();
      await page.getByRole('button', { name: he.back }).click();
    }
    await expect(profileRows(page).filter({ hasText: 'Saved' })).toHaveCount(2);

    await page.getByRole('navigation').getByRole('link', { name: 'History' }).click();

    await expect(profileRows(page)).toHaveCount(2);
    await page.getByRole('combobox', { name: 'Country' }).selectOption('United Kingdom');
    await expect(profileRows(page)).toHaveCount(1);
    await expect(profileRows(page)).toContainText('luke.kelly@example.com');
  });

  test('shows a helpful empty state', async ({ page }) => {
    await page.goto('/saved');

    await expect(page.getByText('No saved profiles yet.')).toBeVisible();
  });
});
