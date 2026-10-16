# Profinq API (server)

Node + TypeScript REST API (Express 5, `pg`, zod) that stores user profiles in PostgreSQL.

## Prerequisites

- Node.js 20.11+ (22 LTS recommended)
- PostgreSQL 14+. The repo root `docker-compose.yml` starts one: `docker compose up -d`.

## Install and run

```bash
cp .env.example .env   # then adjust if your database differs
npm install
npm run dev            # watch mode via tsx, http://localhost:4000
```

Production:

```bash
npm run build
npm start              # node dist/index.js
```

On startup the server waits for the database (up to ~10 s), applies any pending migrations, then starts listening. SIGINT/SIGTERM stop new connections, let in-flight requests finish (up to 10 s), and close the pool.

## Environment variables

| Variable                       | Required | Default                                                     | Description                                                                    |
| ------------------------------ | -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                 | yes      | none                                                        | `postgres://user:pass@host:port/db`                                            |
| `PORT`                         | no       | `4000`                                                      | HTTP port                                                                      |
| `DB_POOL_SIZE`                 | no       | `10`                                                        | Maximum pooled connections (1-100)                                             |
| `CORS_ORIGINS`                 | no       | `http://localhost:5173`                                     | Comma-separated list of exact allowed browser origins                          |
| `TRUST_PROXY_HOPS`             | no       | `0`                                                         | Proxies in front of the API, so rate limits see the real client IP             |
| `RATE_LIMIT_READS_PER_MINUTE`  | no       | `300`                                                       | `GET` requests per client IP per minute                                        |
| `RATE_LIMIT_WRITES_PER_MINUTE` | no       | `60`                                                        | `POST` / `PUT` / `DELETE` requests per client IP per minute                    |
| `TEST_DATABASE_URL`            | tests    | `postgres://profiles:profiles@localhost:5432/profiles_test` | Used by `npm test`. The name must end in `_test` (the suite truncates tables). |

Invalid configuration stops the process at boot with a list of everything that is wrong.

## API

| Method   | Path                | Purpose                                                    | Responses     |
| -------- | ------------------- | ---------------------------------------------------------- | ------------- |
| `GET`    | `/api/profiles`     | One page of saved profiles, newest first (see below)       | 200, 400      |
| `GET`    | `/api/profiles/:id` | One saved profile                                          | 200, 400, 404 |
| `POST`   | `/api/profiles`     | Save a profile                                             | 201, 400, 409 |
| `PUT`    | `/api/profiles/:id` | Replace every editable field (name, gender, contact, etc.) | 200, 400, 404 |
| `DELETE` | `/api/profiles/:id` | Delete                                                     | 204, 400, 404 |
| `GET`    | `/api/health`       | Liveness + database check (not rate limited)               | 200, 503      |

`GET /api/profiles` returns `{ "profiles": [...], "nextCursor": string | null }`.

- `?limit=1..100` (default 20) sets the page size; `?cursor=` (the previous `nextCursor`) fetches the next page. Keyset pagination on `(saved_at, id)` uses the matching index, so every page costs the same, and rows saved meanwhile never shift a page.
- `?ids=a,b,c` (up to 100) returns just those that are saved, in one query. Screen 1 uses it to mark saved people. It cannot be combined with `limit` / `cursor`.

Every route may also answer `413` (body over 32 KB), `415` (not JSON), `429` (rate limit, with `RateLimit` headers) or `503` (database down). Errors always have the shape `{ "error": { "code", "message", "details?" } }`; on a `400`, `details` lists `{ path, message }` per field (`body.location.country`), which the client shows next to that input. Codes are listed in `src/constants/errorCode.ts`.

**Validation** (`src/domain/profile/profile.schema.ts`): names are letters with spaces, apostrophes, dots and hyphens; title, gender and country come from closed lists (`Title`, `Gender`, ISO 3166-1 `COUNTRIES`); the street number is a JSON integer 1-99999; the date of birth is a calendar date `YYYY-MM-DD`, from 1900 to today; phones accept any common format (`058-6043122`, `+972 (58) 604-3122`, `030/1234567`, `1-800-FLOWERS`, extensions) with 5-20 dialable characters; control and BiDi-override characters are rejected everywhere.

## Scripts

| Script          | Does                                                           |
| --------------- | -------------------------------------------------------------- |
| `npm run dev`   | Run from source with reload                                    |
| `npm run build` | Compile to `dist/`                                             |
| `npm test`      | Integration tests (supertest → Express → real PostgreSQL)      |
| `npm run check` | typecheck + lint (typescript-eslint strict) + Prettier + tests |

## Structure

```
src/
  index.ts           composition root: config → pool → migrations → app → graceful shutdown
  app.ts             Express app factory (dependencies injected, so tests build their own)
  config/            environment parsing and validation (zod)
  constants/         HttpStatus, ErrorCode and ApiPath enums, request and page limits
  domain/            profile schemas, types, limits and the country list (the single source of validation); pagination types; domain errors
  services/          business rules (not found / already exists)
  repositories/      ProfileRepository interface + PostgreSQL implementation
  db/                pool, health check, unavailability detection, versioned migrations + runner
  http/routes/       health and profiles routers; request parsing and the opaque page cursor live in http/
  http/middleware/   security headers, rate limits, 404, central error → status mapping
test/                API, schema, pagination, query-plan and constraint tests on a real database; config, pool and logger tests
```

Request flow: route → zod parse (400 on failure) → `ProfileService` → repository (one atomic SQL statement) → JSON. Errors from any layer reach one error handler that maps them to `400 / 404 / 409 / 413 / 415 / 429 / 503 / 500`. Unexpected errors are logged, and the client only gets a generic message.

**Security:** parameterized SQL only; strict zod schemas (unknown fields rejected, length limits, https-only picture URLs); a 32 KB body limit; a CORS allow-list; per-IP rate limits (reads and writes counted separately); `nosniff`, `DENY` framing and a deny-all CSP on every response; no `X-Powered-By`; a statement timeout so a runaway query cannot pin a connection.
