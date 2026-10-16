import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { randomUserResponse } from './randomUsers';

const RANDOM_USER_API = 'https://randomuser.me/api/?**';
const RANDOM_USER_PORTRAITS = 'https://randomuser.me/api/portraits/**';
// 1×1 transparent PNG: portraits load instantly and offline.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export const he = {
  save: 'שמירה',
  update: 'עדכון',
  delete: 'מחיקה',
  back: 'חזרה',
  cancel: 'ביטול',
  discard: 'יציאה בלי שמירה',
  savedStamp: 'שמור במאגר',
  savedFeedback: 'הפרופיל נשמר במאגר',
  updatedLocal: 'השם עודכן ברשימה',
  updatedSaved: 'השם עודכן במאגר',
  firstName: 'שם פרטי',
  lastName: 'שם משפחה',
  gender: 'מגדר',
  required: 'שדה חובה',
  notFound: 'הפרופיל לא נמצא',
} as const;

async function deleteAllSavedProfiles(request: APIRequestContext): Promise<void> {
  const response = await request.get('/api/profiles');
  expect(response.ok()).toBe(true);
  const { profiles } = (await response.json()) as { profiles: { id: string }[] };
  await Promise.all(profiles.map((profile) => request.delete(`/api/profiles/${profile.id}`)));
}

export async function stubRandomUser(page: Page): Promise<void> {
  await page.route(RANDOM_USER_API, (route) => route.fulfill({ json: randomUserResponse }));
}

// The browser logs every non-2xx response; tests that provoke one (404, 503) expect it.
const EXPECTED_HTTP_ERROR_LOG = /^Failed to load resource: the server responded with a status of/;

/**
 * Every test starts with an empty database and a deterministic randomuser.me,
 * and fails if the page throws or logs an error (e.g. a CSP violation) along the way.
 */
export const test = base.extend<{ cleanState: void }>({
  cleanState: [
    async ({ page, request }, use) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && !EXPECTED_HTTP_ERROR_LOG.test(message.text())) {
          pageErrors.push(message.text());
        }
      });

      await deleteAllSavedProfiles(request);
      await page.route(RANDOM_USER_PORTRAITS, (route) => route.fulfill({ body: PIXEL_PNG, contentType: 'image/png' }));
      await stubRandomUser(page);
      await use();

      expect(pageErrors, 'errors logged by the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export function profileRows(page: Page) {
  return page.getByRole('main').getByRole('listitem');
}

/** Home → Fetch → Screen 1 with the fixture batch rendered. */
export async function openRandomList(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /^Fetch/ }).click();
  await expect(page).toHaveURL(/\/random$/);
  await expect(profileRows(page)).toHaveCount(10);
}

export async function openProfile(page: Page, name: RegExp | string): Promise<void> {
  await profileRows(page).filter({ hasText: name }).getByRole('link').click();
  await expect(page.locator('article[dir="rtl"]')).toBeVisible();
}
