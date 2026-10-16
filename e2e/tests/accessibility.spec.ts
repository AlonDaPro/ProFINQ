import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, he, openProfile, openRandomList, test } from '../fixtures/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual(
    [],
  );
}

test.describe('Accessibility (axe, WCAG 2.1 AA)', () => {
  // Also proves reduced motion is honoured, and lets axe measure the stamp at full opacity, not mid-animation.
  test.use({ reducedMotion: 'reduce' });

  test('home @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main').getByRole('link', { name: /^History/ })).toContainText('saved');
    await expectNoViolations(page);
  });

  test('random list @mobile', async ({ page }) => {
    await openRandomList(page);
    await expectNoViolations(page);
  });

  test('profile detail, before and after saving @mobile', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    await expectNoViolations(page);

    await page.getByRole('button', { name: he.save }).click();
    await expect(page.getByText(he.savedStamp)).toBeVisible();
    await expectNoViolations(page);
  });

  test('confirm dialog', async ({ page }) => {
    await openRandomList(page);
    await openProfile(page, 'Noa Levi');
    await page.getByRole('button', { name: he.save }).click();
    await page.getByRole('button', { name: he.delete }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('the whole flow works with the keyboard alone', async ({ page }) => {
    await openRandomList(page);
    const firstRowLink = page.getByRole('main').getByRole('listitem').first().getByRole('link');
    await firstRowLink.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('article[dir="rtl"]')).toBeVisible();

    await page.getByRole('button', { name: he.save }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(he.savedFeedback)).toBeVisible();

    await page.getByRole('button', { name: he.delete }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alertdialog').getByRole('button', { name: he.cancel })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeHidden();
  });
});
