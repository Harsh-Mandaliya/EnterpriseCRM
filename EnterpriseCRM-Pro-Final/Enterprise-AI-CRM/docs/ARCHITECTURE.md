# Architecture

```
┌────────────────────────── crm-mobile-expo ───────────────────────────┐
│ App.tsx → Redux Provider → SafeArea → ThemeProvider → RootNavigator   │
│                                                     │                │
│   role → Owner / Admin / Manager / Sales / Employee navigator        │
│   screens/*  ── api/*.api.ts ── api/client.ts (axios, auto-refresh)  │
│   redux/slices/* (auth, branding, leads, opportunities, …)           │
│   storage/secureStorage.ts (SecureStore; localStorage on web)        │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS JSON  /api/v1
┌────────────────────────── crm-backend-mongo ─────────────────────────┐
│ app.ts: requestId → helmet → CORS → body limits → sanitize → morgan  │
│         → /health /ready → API rate limit → module routers → errors  │
│ module = routes → validate(zod) → requireAuth → requireRole          │
│          → controller → service (company + ownership scope) → model  │
│ utils: permissions, scope, jwt, hash, audit, logger, google          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Mongoose 8
                               MongoDB
```

## Backend

`src/modules/<name>/{routes,controller,service,validation}.ts` — 17 modules: auth, users, company, teams, csv, customers, leads, opportunities, activities, products, invoices, payments, calendar, notifications, dashboard, reports, ai.

- **Authentication** — `middlewares/auth.middleware.ts` verifies the JWT and re-loads `{companyId, role, isActive}` from the User document on every request.
- **Authorization** — `middlewares/rbac.middleware.ts` (`requireRole`) with role groups from `utils/permissions.ts`; `utils/scope.ts` adds `ownershipFilter()` (record ownership) and `assertSameCompanyRefs()` (cross-tenant references).
- **Security middleware** — `middlewares/security.middleware.ts`: request id, NoSQL-injection guard, in-memory rate limiter.
- **Errors** — `ApiError` → JSON; Mongoose validation/cast/duplicate errors mapped to 400/409; everything else 500 with `requestId`.
- **Process** — `server.ts` graceful shutdown on SIGINT/SIGTERM (stop accepting, close MongoDB, 10 s hard limit).

## Database

| Collection | Key fields | Indexes |
|---|---|---|
| companies | name, **slug** (unique company code), **branding** {displayName, logoUrl, preset, primaryColor, accentColor, cornerStyle, density, colorMode, roleThemes, allowUserThemes}, timezone, locale, currency | slug unique |
| users | companyId, name, email, passwordHash (select:false), googleId, authProvider, role, isActive, lastLoginAt, **preferences** {themePreset, colorMode} | email unique, googleId unique sparse, companyId |
| refreshtokens | _id = tokenId, userId, **familyId**, **tokenHash**, expiresAt, revokedAt | tokenHash unique, userId, familyId, TTL on expiresAt |
| passwordresettokens | userId, tokenHash, expiresAt, usedAt | tokenHash unique, TTL |
| auditlogs | companyId, actorId, action, targetType, targetId, metadata | companyId+createdAt |
| teams | companyId, name, territory, managerId, memberIds[] | {companyId,name} unique, {companyId,managerId}, {companyId,memberIds} |
| customers | companyId, name, email, phone, **phoneDigits**, gstin, **ownerId**, **sharedWithIds[]** | companyId+ownerId, companyId+sharedWithIds, companyId+email, companyId+phoneDigits, text |
| leads | companyId, name, email (lower-case), phone, **phoneDigits**, status, assignedToId, customerId, **convertedAt**, **opportunityId** | companyId+assignedToId, companyId+email, companyId+phoneDigits |
| opportunities, activities, products, invoices, payments, calendarevents, notifications | companyId on all; opportunities.ownerId; calendarevents.createdById; invoices.invoiceNumber | companyId on all; invoices {companyId, invoiceNumber} unique |

Migration: `scripts/migrate.ts` (idempotent, `--dry` supported).

## Mobile

- **Navigation** — `RootNavigator` picks a navigator by role. All role navigators share one param list (`navigation/types.ts → AppStackParamList`) because they render the same screens; each registers only the routes that role may open. The `NavigationContainer` is keyed by the theme so a theme change re-mounts the tree while restoring navigation state.
- **State** — Redux Toolkit slices; `brandingSlice` holds the signed-in company's branding (filled from `/auth/me`, cleared on logout) and the pre-login company look.
- **API** — `api/client.ts`: axios instance, bearer token injection, single-flight refresh on 401, `getApiErrorMessage()` for user-facing errors.
- **Theme** — see [THEMING.md](THEMING.md).
- **Shared UI** — `components/common`: Button, Card, TextField, SegmentedControl, CompanyBrand, ScreenState (loading/empty/error), StatusBadge; `utils/confirm.ts` for cross-platform destructive confirmations.

## Integrations

| Integration | Status |
|---|---|
| Google sign-in | Backend verification implemented; needs `GOOGLE_CLIENT_ID` and a client-side Google flow — live sign-in not verified |
| E-mail (password reset) | Not integrated; reset link logged outside production |
| Push notifications | Not implemented (in-app notifications only) |
| AI | Rule-based scoring/forecast over company data; no external LLM |
