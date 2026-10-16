# Profiles (client)

Vue 3 (Composition API, `<script setup>`) + TypeScript + Vite + Pinia + Vue Router. Plain CSS with design tokens.

## Prerequisites

- Node.js 20.11+ (22 LTS recommended)
- The API from `../server` running on http://localhost:4000. Screen 1 works without it, but Save and History need it.

## Install and run

```bash
npm install
npm run dev        # http://localhost:5173
```

In development (and `vite preview`), Vite proxies `/api/*` to the API, so the browser sees one origin and needs no CORS setup.

Production build:

```bash
npm run build      # type-checks, then outputs dist/
npm run preview
```

## Environment variables

Both are optional. Copy `.env.example` to `.env` to override them.

| Variable            | Default                 | Description                                                                                                                                               |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                  | API base URL as seen by the browser. For a deployed build, set a full URL (it is also added to the CSP) and add this site to the server's `CORS_ORIGINS`. |
| `API_PROXY_TARGET`  | `http://localhost:4000` | Dev/preview server only: where `/api` is proxied.                                                                                                         |

## Scripts

| Script          | Does                                                      |
| --------------- | --------------------------------------------------------- |
| `npm run dev`   | Dev server with HMR                                       |
| `npm test`      | Unit and component tests (Vitest + Vue Test Utils, jsdom) |
| `npm run check` | vue-tsc + ESLint (strict type-checked) + Prettier + tests |

Browser end-to-end tests live in [`../e2e`](../e2e).

## Screens

| Route         | Screen                                                                |
| ------------- | --------------------------------------------------------------------- |
| `/`           | 0, Home: **Fetch** (loads a new batch) and **History**                |
| `/random`     | 1: random people, filter by name and country (filter kept in the URL) |
| `/saved`      | 2: saved profiles from the API, same list component                   |
| `/random/:id` | 3: profile detail for an unsaved person (RTL, Hebrew labels)          |
| `/saved/:id`  | 3: profile detail for a saved person                                  |

## Structure

```
src/
  api/http/          fetch wrapper: timeouts, cancellation, typed ApiError, zod-validated responses
  api/randomUser/    randomuser.me schema, mapper (→ Profile) and client
  api/profilesApi.ts profiles API client
  constants/         app, HTTP and API constants and enums
  types/             AsyncState and Feedback types shared by stores and views
  domain/profile/    Profile schemas and types, name and age helpers, limits mirrored from the server
  domain/filter/     pure filter logic (search index, matching, country list)
  stores/            Pinia: randomProfiles (in-memory batch), savedProfiles (server state)
  composables/       useRouteFilter (filter ↔ URL), useProfileDetail (Screen 3), useConfirm (dialog)
  components/        layout/, ui/ (StatusMessage, ConfirmDialog), icons/, decor/ (Home flow cards),
                     profile/list/, profile/detail/
  views/             one component per route
  i18n/              en.ts (Screens 0–2), he.ts (Screen 3)
  styles/            tokens, base, controls, utilities
test/                unit/ (domain, api, stores, composables), components/, fixtures/
```

**Performance:** routes other than Home are lazy chunks; fonts are self-hosted, with per-script unicode ranges; a preconnect to randomuser.me; lazy, async-decoded thumbnails with fixed size (no layout shift) and a high-priority portrait on Screen 3; superseded randomuser requests are aborted; concurrent loads of the saved list share one request.

**Security:** the production build ships a strict Content-Security-Policy (`script-src 'self'`, images and connections only to self and randomuser.me); every API response is validated with zod before it reaches the UI; Vue's escaping is never bypassed (no `v-html`).
