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
  updatedLocal: 'הפרטים עודכנו ברשימה',
  updatedSaved: 'הפרטים עודכנו במאגר',
  fixFields: 'השרת דחה חלק מהשדות',
  tooManyRequests: 'יותר מדי בקשות',
  invalidFormOne: 'יש לתקן שדה אחד לפני השמירה',
  title: 'תואר',
  clearTitle: 'ניקוי התואר',
  firstName: 'שם פרטי',
  lastName: 'שם משפחה',
  gender: 'מגדר',
  dateOfBirth: 'תאריך לידה',
  streetNumber: 'מספר בית',
  street: 'רחוב',
  city: 'עיר',
  state: 'מחוז',
  country: 'ארץ',
  email: 'דוא״ל',
  phone: 'טלפון',
  age: 'גיל',
  female: 'נקבה',
  required: 'שדה חובה',
  invalidEmail: 'כתובת דוא״ל לא תקינה',
  invalidPhone: 'מספר טלפון לא תקין',
  notWholeNumber: 'מספר שלם בלבד',
  invalidName: 'אותיות בלבד',
  notFound: 'הפרופיל לא נמצא',
} as const;

interface ProfilePage {
  profiles: { id: string }[];
  nextCursor: string | null;
}

/** Deletes every saved profile, page by page (the list endpoint is paginated). */
async function deleteAllSavedProfiles(request: APIRequestContext): Promise<void> {
  for (;;) {
    const response = await request.get('/api/profiles?limit=100');
    expect(response.ok()).toBe(true);
    const { profiles } = (await response.json()) as ProfilePage;
    if (profiles.length === 0) return;
    await Promise.all(profiles.map((profile) => request.delete(`/api/profiles/${profile.id}`)));
  }
}

/** Saves `count` valid profiles straight through the API, newest last. */
export async function seedSavedProfiles(request: APIRequestContext, count: number): Promise<void> {
  for (let index = 0; index < count; index++) {
    const response = await request.post('/api/profiles', {
      data: {
        id: `seed-${String(index).padStart(3, '0')}`,
        name: { title: 'Ms', first: 'Seed', last: `Person ${String.fromCharCode(65 + (index % 26))}` },
        gender: 'female',
        email: `seed${index}@example.com`,
        phone: '058-6043122',
        picture: {
          large: 'https://randomuser.me/api/portraits/women/1.jpg',
          thumbnail: 'https://randomuser.me/api/portraits/thumb/women/1.jpg',
        },
        location: { streetNumber: index + 1, streetName: 'Herzl', city: 'Haifa', state: '', country: 'Israel' },
        dateOfBirth: '1990-01-01',
      },
    });
    expect(response.status()).toBe(201);
  }
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
