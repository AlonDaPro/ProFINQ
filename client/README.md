# Profinq client

The Vue 3 front end of Profinq: a home screen, two lists (random people and saved ones), and a Hebrew right-to-left profile screen.

**Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Pinia, Vue Router, zod, and shadcn-vue components on Tailwind CSS v4.

## Prerequisites

- Node.js 20.11+ (22 LTS recommended)
- The API from [`../server`](../server) on http://localhost:4000. Screen 1 works without it, but Save and History need it.

## Install and run

```bash
npm install
npm run dev        # http://localhost:5173
```

In development (and in `npm run preview`) Vite proxies `/api/*` to the API, so the browser sees a single origin.

For a production build:

```bash
npm run build      # type-checks, then writes dist/
npm run preview
```

## Environment variables

Both are optional. Copy `.env.example` to `.env` to override them.

| Variable            | Default                 | What it does                                                                                                                                        |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                  | Where the browser finds the API. For a deployed build use a full URL; it is added to the CSP, and the API must allow this origin in `CORS_ORIGINS`. |
| `API_PROXY_TARGET`  | `http://localhost:4000` | Dev and preview server only: where `/api` is proxied.                                                                                               |

## Scripts

| Script          | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `npm run dev`   | Dev server with hot reload                                 |
| `npm run build` | Type-check and build for production                        |
| `npm test`      | Unit and component tests (Vitest, Vue Test Utils, jsdom)   |
| `npm run check` | vue-tsc, ESLint (strict, type-checked), Prettier and tests |

The browser tests live in [`../e2e`](../e2e).

## How the code is organised

```
src/
  api/              fetch wrapper (timeouts, cancellation, typed errors), randomuser.me adapter, profiles API
  components/
    ui/             shadcn-vue primitives (Button, Card, Badge, Input, AlertDialog...), owned and themed here
    common/         StatusMessage, ConfirmDialog
    brand/          the Profinq logo as an inline SVG component
    layout/         header and the About section
    decor/          the fanned cards on Home
    profile/        list/ and detail/ building blocks for Screens 1 to 3
  composables/      useRouteFilter (filter in the URL), useProfileDetail (Screen 3), useConfirm
  constants/        app, HTTP, API and locale constants
  domain/           Profile types and schemas, name and age helpers, filter logic
  i18n/             en.ts for Screens 0 to 2, he.ts for Screen 3
  lib/              cn() for merging Tailwind classes
  stores/           randomProfiles (the batch, in memory) and savedProfiles (server state)
  styles/           tokens, the shadcn theme mapping, base styles and a few utilities
  types/            AsyncState and Feedback
  views/            one component per route
test/               unit/, components/ and fixtures/
```

## Styling

The look follows [finqai.co.il](https://finqai.co.il): ink on white, black pill buttons, and soft lavender, mint and gold bands with a light grain. All colours, radii and shadows are tokens in `src/styles/tokens.css`. `src/styles/theme.css` maps shadcn's semantic variables (`--primary`, `--ring` and so on) onto those tokens, so the shadcn components and the hand-written layout share one palette. The shadcn files in `components/ui/` are ours to change, and some are: pill buttons, an outlined `tag` badge, and logical (RTL-safe) spacing in the select.

Layout uses logical CSS properties (`margin-inline-start`, `ps-*`, `pe-*`) throughout, so the Hebrew screen mirrors without any RTL-specific overrides.

## Performance and security

- Every screen except Home is a lazy-loaded chunk.
- Rubik is self-hosted as a variable font, and per-script unicode ranges mean the browser downloads only the scripts a page uses.
- The logo is a 3 KB inline SVG. Thumbnails load lazily with fixed sizes, so nothing shifts, and the Screen 3 portrait loads first.
- Superseded randomuser.me requests are cancelled, and concurrent loads of the saved list share one request.
- The production build ships a strict Content-Security-Policy (`script-src 'self'`, images and connections only to this site and randomuser.me). Every API response is validated with zod, and nothing is rendered with `v-html`.
