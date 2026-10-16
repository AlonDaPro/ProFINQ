# Decisions

## 1. "Saved" is decided by the database, not by the screen you came from

Read literally, Save shows when you come from Screen 1. But save someone, go back and reopen them, and Save would show again and fail. So Screen 3 asks the server whether the id is saved; the route (`/random/:id` vs `/saved/:id`) only picks the Back target. A 409 on Save or a 404 on Delete counts as success: the user's intent is already met.
**Tradeoff:** Screen 1 makes one batched `?ids=` request to mark people already saved.

## 2. Filters live in the URL and apply instantly

Name matches in any word order, ignoring case and accents ("garcia jose" finds "José García"); country is a `<select>` built from the data. Kept in `?name=&country=`, the filter survives Screen 3, reloads and back/forward.
**Tradeoff:** History filters only the loaded pages. At scale: server-side search with a trigram index.

## 3. PostgreSQL with typed columns and keyset pagination

Real columns with CHECK constraints, not a JSON blob. A duplicate save is one `INSERT … ON CONFLICT DO NOTHING`, so a double click gives one row and a 409. History pages by `(saved_at, id)` with an opaque cursor, served by a matching index (asserted on the query plan): page 1,000 costs the same as page 1.
**Tradeoff:** needs Docker, and the migration runner is hand-rolled.

## 4. Pinia for state

The random batch must outlive the list view (an edit on Screen 3 shows on Screen 1), and saved profiles are shared by three screens. Mutations are pessimistic: the UI changes after the server agrees.
**Tradeoff:** a dependency for what a few `reactive` modules could do, in exchange for devtools and a clear owner per piece of state.

## 5. shadcn-vue on Tailwind, themed to FINQ

Reka UI gives accessible primitives (focus-trapped dialog, searchable comboboxes for title and country), and owning the component code let me restyle them freely.
**Tradeoff:** a larger bundle and a CSS build step.

## Validation

Every field is editable and validated twice, with the same rules: zod in the form (Save stays disabled, the error shows on the field) and zod on the server, which is the authority. Title and country are closed lists (ISO 3166-1 names), picked rather than typed. Phones are checked by structure, not per country: libphonenumber would reject randomuser.me's synthetic numbers and any number typed without its country code.

## RTL / LTR on Screen 3

Only Screen 3 is `<article dir="rtl" lang="he">`; layout uses logical CSS properties, so it mirrors with no overrides. Data never inherits the Hebrew direction: names are `dir="auto"` (Latin stays LTR, Persian stays RTL), while title, country, email and phone are `dir="ltr"`, because RTL would reorder `(272) 790-0888`. Back's chevron mirrors via `:dir(rtl)`, and the dialog carries its own `dir`. Playwright asserts the computed directions.

## Corners cut deliberately

- Fetch replaces the batch, so unsaved edits to the previous one are lost → keep it in `sessionStorage`.
- Two tabs editing one profile: the last Update wins → an `updated_at` precondition and a 409.
- On Vercel the rate limit counts per function instance → a shared store (Redis) or the Vercel Firewall.
- The API contract is duplicated as zod schemas on both sides → a shared package.

## Extension: critical-path tests in a real browser

Playwright runs the whole journey against production builds on real Postgres, in CI: Fetch → filter → edit every field → Save → History → Update → Delete, plus validation errors, server rejections, pagination, BiDi directions, keyboard-only use and an axe WCAG 2.1 AA scan, on desktop and mobile. I chose tests because the spec's implicit rules break silently. They caught real bugs, such as Enter not submitting the form. It took longer than the suggested 30 minutes.
