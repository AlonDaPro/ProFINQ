# End-to-end tests

Playwright drives a real Chromium through the whole stack: Vue client → Express API → PostgreSQL. It also runs an axe accessibility scan (WCAG 2.1 AA).

## Prerequisites

- Node.js 20.11+ (22 LTS recommended)
- PostgreSQL with a `profiles_e2e` database. The repo's `docker compose up -d` creates it on a fresh volume. On an existing volume, run:
  `docker compose exec postgres psql -U profiles -d profiles -c "CREATE DATABASE profiles_e2e OWNER profiles;"`
- Dependencies installed in `../server` and `../client` (`npm install` in each)

## Install and run

```bash
npm install
npm run install:browsers   # Chromium, once
npm test                   # builds and starts both apps, then runs the suite
npm run report             # open the HTML report of the last run
```

Playwright starts the **production builds** itself: API on port 4100, client (`vite preview`) on port 4174 (not preview's default, so a preview you left running is never reused). That way the tests cover exactly what ships, CSP included, and never touch your dev servers (4000/5173) or dev database. The API under test gets very high rate limits, since the suite writes far faster than a person; the limiter has its own server tests.

## Environment variables

| Variable           | Default                                                    | Description                                                       |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `E2E_DATABASE_URL` | `postgres://profiles:profiles@localhost:5432/profiles_e2e` | Database for the API under test. Every test deletes all its rows. |
| `CI`               | unset                                                      | On CI: no server reuse, one retry, GitHub annotations.            |

## What is covered

| Spec                      | Covers                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.spec.ts`            | Fetch / History buttons, a new batch per Fetch, the saved count                                                                                                                                               |
| `profile-lists.spec.ts`   | Row content, name and country filters, filter kept in the URL, error and retry, empty state, phone layout                                                                                                     |
| `profile-detail.spec.ts`  | Save, Update (in memory vs persisted), Delete with confirm, unsaved-changes guard, reload, BiDi directions                                                                                                    |
| `profile-editing.spec.ts` | Editing every field and checking the stored types, title and country comboboxes, Hebrew errors that block Save, phone formats, server 400/429 handling, leaving mid-save, History pagination, the Saved badge |
| `accessibility.spec.ts`   | axe scan of every screen and the dialog, keyboard-only flow, reduced motion                                                                                                                                   |

randomuser.me is stubbed with a fixed batch (`fixtures/randomUsers.ts`): accents, a Persian name, and an email that strict validators reject. Runs are deterministic and work offline. Tests tagged `@mobile` also run on a Pixel 7 viewport.
