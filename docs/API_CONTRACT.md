# AstroHealth API & Full-Stack Contract

This document defines the planned Vercel/Supabase backend contract. The browser engine contract remains [`CONTRACT.md`](./CONTRACT.md).

## Architecture

- React 19 + Vite browser application.
- One Vercel catch-all function: `api/[[...route]].js`.
- Route registry: `src/server/routes/index.js`.
- Route handlers: `src/server/routes/*.js`.
- Supabase Auth with email/password and Supabase Postgres.
- Roles: `crew`, `ground`, `admin`.
- Plain JavaScript ES modules and Zod request schemas.
- The engine in `src/engine/` remains server/browser-compatible and behaviorally frozen except for bug fixes.

## Response Format

Every route returns JSON.

Success payloads are route-specific JSON. They may be a profile, crew record, engine output,
check-in list, report, or audit list. Route-specific payload shapes must be documented
below or in route JSDoc.

Errors:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication is required."
  }
}
```

Common codes:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `INVALID_REQUEST` | Request JSON or Zod validation failed |
| 401 | `UNAUTHENTICATED` | Missing, expired, or invalid JWT |
| 403 | `FORBIDDEN` | User role or crew ownership does not permit the operation |
| 404 | `NOT_FOUND` | Resource does not exist |
| 429 | `RATE_LIMITED` | Postgres or provider rate limit reached |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |
| 502 | `UPSTREAM_ERROR` | AI provider or network failure |
| 503 | `SERVICE_UNAVAILABLE` | Optional service is not configured |

## Authentication

- Browser clients obtain a Supabase session and send `Authorization: Bearer <access-token>`.
- `withAuth(handler, { roles })` verifies the JWT with Supabase and loads `profiles.role` from Postgres.
- Browser-supplied role values are never trusted.
- Outside production, local development may use `x-dev-role: crew|ground|admin` only for explicitly stubbed routes.
- `apiFetch` attaches the bearer token, refreshes once after a 401, and maps the shared error format to UI messages.
- Signup always creates a `crew` profile. Ground/admin promotion is SQL- or admin-controlled.

## Route Registry

Each route file exports:

```javascript
{
  method: "GET",
  path: "/api/health",
  roles: [],
  handler: async (req, ctx) => new Response()
}
```

Shared helpers:

- `ok(data, status = 200)` serializes the documented success payload.
- `fail(code, message, status)` returns the common error shape.
- `parse(schema, body)` validates JSON through Zod.
- `writeAudit(actor, action, target, meta)` writes server-side audit records.

## HTTP Endpoints

| Method | Path | Roles | Owner | Purpose |
|---|---|---|---|---|
| `GET` | `/api/health` | public; `?deep=1` requires `HEALTH_TOKEN` | P1 | Liveness and database check |
| `GET` | `/api/me` | signed-in | P2 | Current profile and server-authoritative role |
| `GET` | `/api/crew` | ground/admin; crew gets own crew | P1 | Crew roster with latest engine badge |
| `GET` | `/api/crew/:id/state` | crew owner, ground, admin | P1 | Stored engine input and latest evaluated output |
| `POST` | `/api/crew/:id/check-ins` | crew owner | P1 | Validate, run `addReading`, run `evaluate`, persist snapshot |
| `GET` | `/api/crew/:id/check-ins` | crew owner, ground, admin | P1 | Check-in history for trends |
| `POST` | `/api/telemetry` | admin or secret | P1 | Ingest radiation or environmental telemetry |
| `POST` | `/api/ask` | signed-in | P1, wrapped by P2 `withAuth` | Protocol AI, rate-limited |
| `POST` | `/api/reports` | crew | P2 | Queue Mars report packet |
| `GET` | `/api/reports` | ground, admin | P2 | Report inbox |
| `PATCH` | `/api/reports/:id` | ground, admin | P2 | Update report status, including acknowledgement |
| `GET` | `/api/audit` | ground, admin | P2 | Audit-log viewer |
| `POST` | `/api/admin/users` | admin | P2 | Create or update a role assignment |
| `PATCH` | `/api/admin/users/:id` | admin | P2 | Promote/demote a user |

### Health

`GET /api/health` is public and returns process readiness.

`GET /api/health?deep=1` requires `HEALTH_TOKEN` and executes one trivial select against a real table. It is used by the scheduled keep-alive.

### Crew State

`GET /api/crew/:id/state` returns the state persisted by the mission adapter:

```json
{
  "profile": {},
  "symptoms": {},
  "readings": {},
  "result": {}
}
```

`result` follows [`CONTRACT.md`](./CONTRACT.md).

### Submit Check-In

`POST /api/crew/:id/check-ins` accepts indicator IDs or aliases and symptoms from `CONTRACT.md`:

```json
{
  "readings": {
    "4A-i": 94,
    "sleep": 5.2
  },
  "symptoms": ["blurred"],
  "timestampUtc": "2026-11-23T16:41:19Z"
}
```

The server runs `addReading(state, payload)`, then `evaluate(newState, preset)`, increments the mission day and streak, trims histories to seven values, stores `readings_json`, `symptoms`, `overall`, `badge`, and `result_json`, and writes an audit entry. The response includes the new state and evaluated result.

### Ask

`POST /api/ask` accepts:

```json
{
  "question": "What is the ONSD procedure?",
  "recordId": "1B-i",
  "history": [
    { "role": "user", "text": "Previous question" },
    { "role": "assistant", "text": "Previous answer" }
  ]
}
```

The existing handler contract currently returns:

```json
{
  "answer": "Protocol answer",
  "sources": []
}
```

It must impose the body-size limit and Postgres-based rate limit in the full backend.

### Reports

Mars report creation computes `deliver_after` from the 5A communication delay:

```json
{
  "crewId": "uuid",
  "packet": {},
  "deliverAfter": "ISO-8601"
}
```

Status lifecycle: `queued` -> `delivered` -> `acknowledged`. Ground/admin may patch an acknowledgement:

```json
{
  "status": "acknowledged"
}
```

Report packets follow `src/utils/reportPacket.js` and include the 1.0 packet shape when no backend-specific fields are needed.

## Postgres Data Model

All tables use Row-Level Security (RLS). The service-role key is used only for operations RLS cannot express and every such operation is rechecked in server code.

| Table | Key Columns | Ownership |
|---|---|---|
| `profiles` | `id` (= auth user id), `email`, `display_name`, `role`, `created_at` | P2 |
| `crew_members` | `id`, `user_id`, `preset`, `name`, `profile_json` | P1/P2 foundation |
| `mission_state` | `crew_id`, `state_json`, `mission_day`, `updated_at` | P1 |
| `check_ins` | `id`, `crew_id`, `submitted_by`, `readings_json`, `symptoms`, `overall`, `badge`, `result_json`, `created_at` | P1 |
| `reports` | `id`, `crew_id`, `packet_json`, `status`, `deliver_after`, `created_at` | P2 |
| `telemetry` | `crew_id`, `indicator`, `value`, `ts` | P1 |
| `audit_log` | `id`, `actor`, `action`, `target`, `meta`, `ts` | P2 |
| `rate_limits` | `key`, `window_start`, `count` | P1 |

RLS:

- Crew may read/write only their own `crew_id`.
- Ground may read all crew data and update reports.
- Admin may perform all permitted operations.
- Profiles are individually readable; role promotion is privileged.
- Audit rows are server-written and not client-writable.

## Migration & Ownership Rules

- Date-prefix migrations: `YYYYMMDD_p1_<name>.sql` or `YYYYMMDD_p2_<name>.sql`.
- The shared foundation migration is written together.
- Person 1 owns mission-state, check-in, telemetry, crew, and rate-limit tables/routes.
- Person 2 owns profiles, reports, audit, auth, and ground/admin screens.
- `docs/API_CONTRACT.md` changes require review from both owners.
- `src/engine/` and `src/data/` are frozen except for bug fixes.
- `package.json` and `vite.config.js` require a message before editing; Person 1 owns Vite middleware.
- The route registry gets one route registration per route.

## Environment Variables

| Variable | Consumer | Visibility |
|---|---|---|
| `VITE_SUPABASE_URL` | Auth browser client | Public |
| `VITE_SUPABASE_ANON_KEY` | Auth browser client | Public; RLS protects data |
| `SUPABASE_URL` | Server | Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Secret; never prefix with `VITE_` |
| `DATABASE_URL` | Migrations and seeds | Secret |
| `GEMINI_API_KEY` | Existing AI handler | Secret |
| `GEMINI_MODEL` | Existing AI handler | Secret or server config |
| `HEALTH_TOKEN` | Deep health check | Secret |
| `SENTRY_DSN` | Optional browser/API error tracking | Public DSN or secret config as platform requires |
| `RESEND_API_KEY` | Optional alert mail | Secret |

No Supabase service key, database password, Gemini key, bearer token, or secret email key may enter browser code or git.

## Offline & Data Rules

- Check-in submission uses `LocalAdapter` until `RemoteAdapter` is selected.
- Local state remains in `astro_state_<preset>` and history in `astro_history_<preset>`.
- Remote mode calls the mission API and preserves the engine result shape.
- Reports and clinical thresholds remain usable offline; network access is not required to evaluate bundled data.
- Telemetry absorbed-dose values are not dose-equivalent values and must not be converted or mislabeled.
