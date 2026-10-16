# Decisions

## 1. The database decides "saved", not the screen you came from

Taken literally, Save shows whenever you come from Screen 1, so reopening someone you just saved would offer Save again. So Screen 3 asks the server whether the id is saved; the route only picks the Back target. A 409 on Save or a 404 on Delete counts as success.
**Tradeoff:** Screen 1 makes one batched `?ids=` request to mark saved people.

## 2. Filters in the URL; Screen 2 filters on the server

Name matches in any word order, ignoring case and accents; `?name=&country=` survives Screen 3, reloads and back/forward. Screen 1's ten rows filter instantly. History is paginated, so the server filters it (trigram index), after a 250 ms typing pause.
**Tradeoff:** two filter paths that must agree on accent folding.

## 3. PostgreSQL, typed columns, keyset pagination

CHECK constraints guard every column; a duplicate save is one atomic `INSERT … ON CONFLICT DO NOTHING`. History pages by `(saved_at, id)` with an opaque cursor and a matching index: page 1,000 costs what page 1 does.
**Tradeoff:** needs a database server; the migration runner is hand-rolled.

## 4. Pinia, with pessimistic mutations

The random batch must outlive the list (Screen 3 edits show on Screen 1); three screens share saved profiles. The UI changes only after the server agrees.
**Tradeoff:** a dependency, for devtools and one owner per piece of state.

**Also:** shadcn-vue on Tailwind gives accessible primitives (dialog, comboboxes) whose code I own, for a larger bundle. The same zod rules run in the form (Save stays disabled) and on the server, the authority; a test fails if they drift. Phones are checked by structure: libphonenumber rejects randomuser.me's synthetic numbers.

## RTL / LTR on Screen 3

Only Screen 3 is `<article dir="rtl" lang="he">`; logical CSS properties mirror it. Data never inherits the Hebrew direction: names are `dir="auto"` (Latin LTR, Persian RTL); title, country, email and phone are `dir="ltr"`, as RTL would reorder `(272) 790-0888`. Back's chevron mirrors via `:dir(rtl)`; Playwright asserts the directions.

## Corners cut deliberately

- Fetch replaces the batch, losing edits to the old one → `sessionStorage`.
- Two tabs editing one profile: the last Update wins → an `updated_at` precondition.
- On Vercel the rate limit counts per instance → a shared store.

## Extension: critical-path tests in a real browser

Playwright runs the journey against production builds on real Postgres, in CI, on desktop and mobile: fetch, filter, edit, save, update, delete, plus validation, server errors, BiDi and an axe scan. I chose tests over polish because the spec's implicit rules break silently; they caught real bugs. Next hour: run the suite against each Vercel preview.
