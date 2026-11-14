# API reference

Base URL: `http://<host>:4000/api/v1`. JSON in and out. Request bodies are limited to 1 MB.

**Auth:** `Authorization: Bearer <accessToken>` on every route except those marked *public*. Access tokens last `JWT_ACCESS_EXPIRES_IN` (default 15 min); refresh with `/auth/refresh`.

**Errors:** `{ "error": "message", "details"?: ..., "requestId"?: "..." }`. Every response has an `X-Request-Id` header — quote it when reporting a problem.

| Status | Meaning |
|---|---|
| 400 | Validation failed / bad reference / malformed JSON |
| 401 | Missing, invalid or expired token; suspended user |
| 403 | Role not allowed |
| 404 | Not found **or outside your scope** |
| 409 | Duplicate (e-mail, company code, invoice number) |
| 413 | Body too large |
| 429 | Rate limited (`Retry-After` header) |
| 503 | Feature not configured (e.g. Google sign-in) |

Role rules: see [ROLE_PERMISSIONS.md](ROLE_PERMISSIONS.md).

## Health

| Method | Path | |
|---|---|---|
| GET | `/health` | *public* — process is up |
| GET | `/ready` | *public* — 200 only when MongoDB is connected, else 503 |

## Auth (`/auth`) — rate-limited

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/register` | `companyName, ownerName, email, password` | *public*. Creates company (with company code) + OWNER. Returns `{accessToken, refreshToken}` |
| POST | `/login` | `email, password, companyCode?` | *public*. Per IP+e-mail limit. Generic 401 for wrong e-mail or password. With `companyCode` (login page of a company): unknown code → 400; account of another company → 403 (checked after the password) |
| POST | `/google` | `credential` (Google ID token), `companyCode?` | *public*. Verified server-side. 503 if `GOOGLE_CLIENT_ID` unset |
| POST | `/refresh` | `refreshToken` | *public*. Rotates the token. Re-using an old token revokes the whole session family |
| POST | `/logout` | `refreshToken` | *public*. Revokes that session. 204 |
| POST | `/logout-all` | — | Revokes every session of the caller. 204 |
| POST | `/forgot-password` | `email` | *public*. Always 202 |
| POST | `/reset-password` | `token, password` | *public*. Single-use token, 30 min. Ends all sessions |
| GET | `/me` | — | Profile + `company` + `branding` (see below) + `preferences` |

Password policy: 8–128 characters, at least one uppercase letter and one number.

## Company & branding (`/company`)

| Method | Path | Who | Body |
|---|---|---|---|
| GET | `/public/:code` | *public* (30/min/IP) | — → `{slug, displayName, logoUrl, preset, primaryColor, accentColor, cornerStyle, density, colorMode}` |
| GET | `/branding` | any | — → `BrandingResponse` |
| PATCH | `/branding` | OWNER, ADMIN | any of `displayName, logoUrl (https only), preset, primaryColor, accentColor (#RRGGBB), cornerStyle, density, colorMode, allowUserThemes, roleThemes: {ROLE: preset \| null}` |
| PATCH | `/profile` | OWNER | any of `name, slug, timezone (IANA), locale (en-IN), currency (ISO 4217)` |
| PATCH | `/preferences` | any | `themePreset (preset \| null), colorMode (light\|dark\|system\|null)` |

```jsonc
// BrandingResponse
{
  "company":     { "id", "name", "slug", "timezone", "locale", "currency" },
  "settings":    { "displayName", "logoUrl", "preset", "primaryColor", "accentColor", "cornerStyle",
                   "density", "colorMode", "roleThemes": { "SALES": "emerald" }, "allowUserThemes" },
  "preferences": { "themePreset", "colorMode" },
  "resolved":    { "preset", "colorMode", "primaryColor", "accentColor", "cornerStyle", "density",
                   "displayName", "logoUrl", "source": "user" | "role" | "company" },
  "canEdit": true
}
```

Unknown fields are rejected (400).

## Users (`/users`)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/` , `/:id` | any | Company members (no password hashes) |
| POST | `/` | OWNER, ADMIN | `name, email, password, role` (ADMIN can't create ADMIN) |
| PATCH | `/:id` | OWNER, ADMIN | `name, role, isActive`. Suspending revokes sessions immediately |
| DELETE | `/:id` | OWNER, ADMIN | Not the OWNER, not yourself |

## Teams (`/teams`)

| Method | Path | Who | Body / notes |
|---|---|---|---|
| GET | `/`, `/:id` | any | `{ id, name, territory, managerId, manager, memberIds, members }` |
| POST | `/` | OWNER, ADMIN | `name` (unique per company), `territory?`, `managerId?` (MANAGER or ADMIN), `memberIds?` (company users) |
| PATCH | `/:id` | OWNER, ADMIN | any of the above |
| DELETE | `/:id` | OWNER, ADMIN | Members keep their records; the manager loses team visibility |

A manager leading teams sees their members' records everywhere (leads, deals, customers, invoices, payments, calendar edits, exports). See [ROLE_PERMISSIONS.md](ROLE_PERMISSIONS.md).

## Business records

All lists and single-record reads are filtered by the caller's scope; out-of-scope ids return 404.

| Resource | Endpoints | Notes |
|---|---|---|
| Customers `/customers` | `GET /?page=&pageSize=&search=&ownerId=`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | List returns `{ items, pagination }`. Body adds `ownerId`, `sharedWithIds[]`, `allowDuplicate`. Responses include `id`, `ownerId`, `owner {id,name}`, `sharedWithIds` |
| | `GET /duplicates?email=&phone=&excludeId=` | `{ duplicates: DuplicateMatch[] }` |
| | `GET /export` | CSV download (OWNER, ADMIN, MANAGER) |
| | `POST /import` | `{ csv, dryRun?, allowDuplicates? }` → `ImportResult` |
| Leads `/leads` | `GET /?status=&assignedToId=`, `GET /:id`, `POST /`, `PATCH /:id`, `PATCH /:id/status`, `DELETE /:id` | Body adds `allowDuplicate` |
| | `POST /:id/convert` | `{ customerId?, createDeal? (default true), deal?: { title?, amount?, closeDate?, stage? } }` → 201 `{ lead, customerId, opportunityId, createdCustomer }`. 409 if already converted; 400 for LOST/UNQUALIFIED leads |
| | `GET /duplicates?email=&phone=&excludeId=` | `{ duplicates: DuplicateMatch[] }` |
| | `GET /export` | CSV download (OWNER, ADMIN, MANAGER) |
| | `POST /import` | `{ csv, dryRun?, allowDuplicates? }` → `ImportResult` |
| Deals `/opportunities` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `PATCH /:id/stage`, `DELETE /:id` | |
| Activities `/activities` | `GET /`, `POST /`, `PATCH /:id/complete`, `PATCH /:id`, `DELETE /:id` | Edit/delete OWNER, ADMIN |
| Products `/products` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | |
| Invoices `/invoices` | `GET /?status=&customerId=`, `GET /:id`, `POST /`, `PATCH /:id`, `PATCH /:id/status`, `DELETE /:id` | Totals computed on the server; numbers `INV-0001…` per company |
| Payments `/payments` | `GET /`, `GET /invoice/:invoiceId/summary`, `POST /` | Payment marks invoice PAID when fully paid |
| Calendar `/calendar` | `GET /?from=&to=`, `POST /`, `PATCH /:id`, `DELETE /:id` | SALES/EMPLOYEE edit only events they created |
| Notifications `/notifications` | `GET /?unreadOnly=`, `PATCH /:id/read`, `PATCH /read-all` | Caller's own only |
| Dashboard `/dashboard` | `GET /summary`, `/admin-summary`, `/manager-summary`, `/sales-summary`, `/employee-summary` | Role-restricted, see matrix |
| Reports `/reports` | `GET /sales`, `/leads`, `/deals`, `/top-customers` | OWNER, ADMIN, MANAGER |
| AI `/ai` | `GET /next-best-actions` (any), `/lead-scores`, `/sales-forecast`, `/customer-insights` (OWNER, ADMIN, MANAGER) | Rule-based scoring over the caller's company data |

All ids are 24-character MongoDB ObjectIds. Query parameters must be plain strings — `?status[$ne]=x` is rejected.

## Duplicate detection

Creating or updating a lead or customer whose e-mail (case-insensitive) or phone (last 10 digits, so `+91 98765-43210` = `9876543210`) matches an existing lead **or** customer in the company returns:

```jsonc
// 409
{ "error": "A lead or customer with this e-mail or phone already exists.",
  "details": { "duplicates": [
    { "type": "lead", "matchedOn": ["email"], "id": "…", "name": "…", "visible": true },
    { "type": "customer", "matchedOn": ["phone"], "visible": false }   // a colleague's record: no id/name
  ] } }
```

Resend with `"allowDuplicate": true` to save anyway.

## CSV import / export

- **Export** — `text/csv; charset=utf-8` with a BOM (opens correctly in Excel), `Content-Disposition: attachment; filename="leads-YYYY-MM-DD.csv"`, `X-Total-Count`. Max 10,000 rows. Cells starting with `= + - @` are prefixed with `'` so spreadsheets never run them as formulas. Every export is audit-logged.
- **Import** — JSON body `{ "csv": "<file text>", "dryRun": false, "allowDuplicates": false }`, max 1,000 rows (~900 KB). The first row is a header; names are case/space-insensitive.
  - Leads: `name` (required), `email`, `phone`, `source` (WEBSITE, REFERRAL, COLD_CALL, SOCIAL_MEDIA, EVENT, OTHER), `status` (NEW, CONTACTED, QUALIFIED, UNQUALIFIED, LOST), `assignedToEmail`.
  - Customers: `name` (required), `email`, `phone`, `gstin`, `address`, `notes`, `ownerEmail`.
  - Rows matching existing records (or earlier rows in the same file) are skipped unless `allowDuplicates`.
  - Response: `{ dryRun, total, created, skippedDuplicates, failed, errors: [{ row, message }] }` where `row` is the line number in the file. Valid rows are saved even if others fail; use `dryRun: true` to validate first.
