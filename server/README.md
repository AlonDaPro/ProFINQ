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

| Variable            | Required | Default                                                     | Description                                                                    |
| ------------------- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`      | yes      | none                                                        | `postgres://user:pass@host:port/db`                                            |
| `PORT`              | no       | `4000`                                                      | HTTP port                                                                      |
| `CORS_ORIGINS`      | no       | `http://localhost:5173`                                     | Comma-separated list of allowed browser origins                                |
| `TEST_DATABASE_URL` | tests    | `postgres://profiles:profiles@localhost:5432/profiles_test` | Used by `npm test`. The name must end in `_test` (the suite truncates tables). |

Invalid configuration stops the process at boot with a list of everything that is wrong.

## API

| Method   | Path                | Purpose                                     | Responses     |
| -------- | ------------------- | ------------------------------------------- | ------------- |
| `GET`    | `/api/profiles`     | List saved profiles, newest first           | 200           |
| `GET`    | `/api/profiles/:id` | Get one saved profile                       | 200, 404      |
| `POST`   | `/api/profiles`     | Save a profile                              | 201, 400, 409 |
| `PATCH`  | `/api/profiles/:id` | Rename (`{ name: { title, first, last } }`) | 200, 400, 404 |
| `DELETE` | `/api/profiles/:id` | Delete                                      | 204, 404      |
| `GET`    | `/api/health`       | Liveness + database check                   | 200, 503      |

Errors always have the shape `{ "error": { "code", "message", "details?" } }`. Codes are listed in `src/constants/errorCode.ts`.

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
  constants/         HttpStatus, ErrorCode and ApiPath enums, request limits
  domain/            profile schemas, types and limits (the single source of validation); domain errors
  services/          business rules (not found / already exists)
  repositories/      ProfileRepository interface + PostgreSQL implementation
  db/                pool, health check, unavailability detection, versioned migrations + runner
  http/routes/       health and profiles routers
  http/middleware/   security headers, 404, central error → status mapping
test/                API integration tests (real database) and config tests
```

Request flow: route → zod parse (400 on failure) → `ProfileService` → repository (one atomic SQL statement) → JSON. Errors from any layer reach one error handler that maps them to `400 / 404 / 409 / 413 / 415 / 503 / 500`. Unexpected errors are logged, and the client only gets a generic message.

**Security:** parameterized SQL only; strict zod schemas (unknown fields rejected, length limits, https-only picture URLs); a 32 KB body limit; a CORS allow-list; `nosniff`, `DENY` framing and a deny-all CSP on every response; no `X-Powered-By`; a statement timeout so a runaway query cannot pin a connection.
