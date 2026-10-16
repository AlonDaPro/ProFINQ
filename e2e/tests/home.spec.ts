import { expect, he, openProfile, openRandomList, test } from '../fixtures/test';

test.describe('Screen 0: Home', () => {
  test('offers Fetch and History, and History shows how many are saved @mobile', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^Fetch/ })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: /^History/ })).toContainText('0 saved');
  });

  test('Fetch loads a new batch every time it is pressed', async ({ page }) => {
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().startsWith('https://randomuser.me/api/?')) requests += 1;
    });

    await openRandomList(page);
    // Back to Home inside the app: a full page load would reset the store and hide a missing refetch.
    await page.getByRole('navigation').getByRole('link', { name: 'Profinq' }).click();
    await page.getByRole('button', { name: /^Fetch/ }).click();
    await expect(page).toHaveURL(/\/random$/);

    await expect.poll(() => requests).toBe(2);
  });

  test('History leads to the saved profiles', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedFeedback)).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('main').getByRole('link', { name: /^History/ })).toContainText('1 saved');
    await page
      .getByRole('main')
      .getByRole('link', { name: /^History/ })
      .click();

    await expect(page).toHaveURL(/\/saved$/);
    await expect(page.getByRole('heading', { name: 'Saved profiles' })).toBeVisible();
  });
});
