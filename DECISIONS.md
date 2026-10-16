# Decisions

## 1. "Saved" is decided by the database, not by the screen you came from

Read literally, Save shows when you come from Screen 1. But save someone, go back and reopen them, and you'd get Save again, and it would fail. So Screen 3 asks the saved store whether the id is in the DB. The route (`/random/:id` vs `/saved/:id`) only picks the Back target. After Save the URL becomes `/saved/:id`, so a reload still works. A 409 on Save or a 404 on Delete counts as success, because the user's intent is already met.
**Tradeoff:** Screen 1 makes one extra request to mark people who are already saved.

## 2. Filters live in the URL and apply instantly, without debounce

Two inputs: free-text name (any word order, case- and accent-insensitive: "garcia jose" finds "José García") and a country `<select>` built from the data. In `?name=&country=` the filter survives Screen 3 and back, reloads and back/forward, and can be shared. Names are normalized once per data change, so a debounce would only add lag.
**Tradeoff:** History filters on the client too. At thousands of rows: server-side `ILIKE` + trigram index, a 250 ms debounce, and aborting stale requests.

## 3. PostgreSQL, typed columns, one atomic statement per operation

Real columns, not a `jsonb` blob: readable in any SQL client, guarded by CHECK constraints, indexable. Duplicate detection is one `INSERT … ON CONFLICT DO NOTHING RETURNING`, so a double click or two tabs give exactly one row and a 409 (tested with 8 parallel requests). A `(saved_at DESC, id)` index serves the newest-first list without a sort step (asserted on the query plan). Migrations are versioned, transactional and serialized by an advisory lock.
**Tradeoff:** more setup than a JSON file (Docker), and a hand-rolled migration runner; beyond one table I'd use `node-pg-migrate`.

**Also:** validation is strict on what users edit and loose on read-only upstream data. Probing 6,000 live randomuser.me records found emails like `hans-j..diederich@example.com` that fail RFC checks and made Save fail. Pinia, because the random batch must outlive the list view (edits on Screen 3 show on Screen 1); mutations are pessimistic. UI: shadcn-vue on Tailwind v4, re-themed with FINQ-style tokens. Reka UI brings accessible primitives (a focus-trapped AlertDialog, labelled inputs), and owning the component code let me make the buttons pills and keep a native `<select>` for phones. The cost is a larger bundle (main JS 177 KB to 262 KB, 88 KB gzipped) and a Tailwind build step.

## RTL / LTR on Screen 3

- Only Screen 3 is `<article dir="rtl" lang="he">`. Layout CSS uses logical properties, so it mirrors with no overrides.
- **Data never inherits the Hebrew direction.** Name inputs are `dir="auto"`: a Latin name stays LTR while typing (caret, selection, brackets), and a Persian name is not forced the wrong way. Email and phone are `dir="ltr"` (a phone is all neutral characters; RTL reorders `(272) 790-0888`). Address parts and English server errors are in `<bdi>`.
- Buttons follow RTL order: primary on the right, Back at the far end, with a chevron that mirrors via `:dir(rtl)`. The confirm dialog renders outside the article, so it carries its own `dir`. Playwright asserts the computed directions.

## Corners cut deliberately

- No pagination on `GET /api/profiles` → keyset pagination on `(saved_at, id)`, whose index already exists.
- API contract duplicated as zod schemas on both sides → a shared package or OpenAPI codegen.
- The random batch is memory-only, so a reload loses it (Screen 3 says so) → `sessionStorage`.
- Copy in TS modules, not `vue-i18n`. No request logging, metrics or rate limiting → pino with request ids, limits at the gateway.

## Extension: critical-path tests in a real browser

36 Playwright tests (desktop + mobile) cover Fetch → filter → edit → Save → History → Update → Delete, BiDi computed directions, keyboard-only use and an axe WCAG 2.1 AA scan. They run against production builds on real Postgres, in CI. I picked tests because the spec's implicit rules break silently. On the first run they caught a real bug: Enter in the name form didn't submit. Next hour: deploy (Render + Neon) and run E2E against the preview URL.
