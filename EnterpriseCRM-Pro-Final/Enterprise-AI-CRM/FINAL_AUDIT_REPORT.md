# EnterpriseCRM Pro — Final Audit Report

Date: 2026-11-03 · Scope: `crm-backend-mongo` (≈8.5k lines, 14 → 15 modules) and `crm-mobile-expo` (≈47k lines). Every result below comes from commands actually run in this environment; anything not run is marked as such.

**Status: substantially improved, not production-ready.** Security, authorization and theming are implemented and tested; several requested business workflows, e-mail delivery, native builds and device testing remain open (see §9).

## 1. Baseline (before changes)

| Check | Baseline |
|---|---|
| Mobile `tsc` | **6 errors** (all six reported ones, no others) |
| Mobile ESLint | **20 errors** |
| Expo Doctor | **18/21** (schema errors, missing `expo-font` peer, Expo patch drift) |
| Backend `tsc` | 0 errors |
| Automated tests | **none** in either app |
| `.env.example` | missing in both apps (README referenced them) |
| Backend audit | 1 critical, 2 high, 2 moderate (prod deps) |
| Mobile audit | 1 critical, 5 high (prod deps) |

## 2. Issues found

**Security / authorization**
1. Access token trusted for role/company until expiry — suspended or demoted users kept access for up to 15 minutes.
2. Refresh tokens stored in plaintext; no reuse detection.
3. SALES/EMPLOYEE could list and edit every lead and deal in the company.
4. Leads/deals/invoices/calendar accepted `customerId`/`assignedToId`/`ownerId` from **another company**, then returned its name via populate (cross-tenant data leak).
5. Any role (incl. EMPLOYEE) could call company-wide dashboard endpoints.
6. ADMIN could create, edit or delete other ADMINs; users could change their own role.
7. No rate limiting / brute-force protection; no body-size limit; no NoSQL-operator guard; no forgot/reset password.
8. Login timing revealed whether an e-mail existed.
9. Server refused to start without `GOOGLE_CLIENT_ID`; Google verification duplicated in two places.

**Functional bugs**
10. **Every user update (role change, rename) failed** with "Password is required" (`passwordHash` is `select:false` but validated on every save).
11. Logout and "remove teammate" did nothing on **web** (`Alert` buttons unsupported in react-native-web).
12. Invoice numbers collided after deleting an invoice (count-based numbering).
13. Registration could leave an orphan company.
14. API client fell back to a hard-coded personal LAN IP.
15. Mobile: the 6 TypeScript errors; 36 `as any` casts in navigators hiding mismatched route param types.

**Theming (the requested enhancement)**
16. No theme system: static `colors.ts` plus hundreds of hard-coded hex values; no dark mode; no company/role branding.

## 3. Fixes and features implemented

| Area | Change | Key files |
|---|---|---|
| TS errors | Added `getAdminDashboardSummary` + type; ambient `process.env` types for TS 6; one shared navigator param list (removed 36 casts); unified `DashboardSummary` | `api/dashboard.api.ts`, `types/env.d.ts`, `navigation/types.ts`, all navigators |
| AuthN | DB re-validation per request; hashed + rotated refresh tokens with family revoke; logout-all; forgot/reset password; timing-safe login; bcrypt 12; Google verification centralised & optional | `middlewares/auth.middleware.ts`, `modules/auth/*`, `models/RefreshToken.model.ts`, `models/PasswordResetToken.model.ts`, `utils/google.ts`, `utils/hash.ts` |
| AuthZ | Ownership scoping, cross-tenant reference checks, dashboard role gates, team hierarchy, activate/suspend | `utils/scope.ts`, `utils/permissions.ts`, leads/opportunities/calendar/invoices/users modules, `dashboard.routes.ts` |
| Hardening | Request ids, NoSQL guard, rate limits, body limits, safe errors, CORS/secret checks, audit log, readiness, graceful shutdown, JSON logs | `middlewares/security.middleware.ts`, `app.ts`, `server.ts`, `config/env.ts`, `utils/audit.ts`, `utils/logger.ts` |
| Branding (backend) | Company branding/code/locale fields, user preferences, `company` module with server-side theme resolution, public pre-login lookup, migration script | `models/Company.model.ts`, `models/User.model.ts`, `modules/company/*`, `scripts/migrate.ts` |
| Theme engine (mobile) | Presets, builder with validation & contrast, live tokens, ThemeProvider/hooks, navigation re-mount with state restore, dark/system mode | `src/theme/*`, `navigation/RootNavigator.tsx`, `App.tsx`, `app.json` |
| Branding UI | Theme & Branding screen (personal / company / role themes / company code), company-code lookup on login, brand header, shared components | `screens/settings/*`, `components/auth/CompanyCodeLookup.tsx`, `components/common/*`, `redux/slices/brandingSlice.ts`, `api/company.api.ts` |
| Existing screens | Codemod: 31 files theme-aware, 188 exact-match colours → tokens, Classic theme visually unchanged | screens/*, navigators, components |
| Bugs 10–14 | Fixed as listed in §2 | `User.model.ts`, `utils/confirm.ts`, `ProfileScreen.tsx`, `UserManagementScreen.tsx`, `invoices.service.ts`, `auth.service.ts`, `api/client.ts` |
| Tooling | Removed unused backend `expo`; Expo 57.0.31; `expo-font`, `expo-splash-screen` plugin; jest-expo + RNTL; ESLint globals; CI workflow; env templates; gitignore | `package.json`s, `app.json`, `.eslintrc.js`, `.github/workflows/ci.yml` |

## 4. Tests actually executed

| Suite | Result |
|---|---|
| Backend `npm test` (auth, authorization/isolation, branding, unit) | **56/56 passed** |
| Mobile `npm test` (theme engine, store, form logic, slice, settings screen by role, components, API errors) | **32/32 passed** |
| Manual E2E in browser (web build + real API, throw-away DB): pre-login branding, role theme, personal dark mode persists, logout clears theme, owner company branding applies | **passed**, no console errors |

Details: [docs/TESTING.md](docs/TESTING.md).

## 5. Build results

| Build | Result |
|---|---|
| Backend `tsc` + `npm run build` | ✅ |
| Mobile `tsc` | ✅ 0 errors (was 6) |
| Mobile ESLint | ✅ 0 (was 20) |
| Expo Doctor | ✅ 21/21 (was 18/21) |
| Web production bundle | ✅ |
| Android / iOS native | ⏭ **not run** |

## 6. Security findings resolved
Items 1–9 in §2. Remaining risks are tracked in [docs/SECURITY.md](docs/SECURITY.md). Production dependency audit now: backend 0 critical (zod 3 high, qs moderate remain); mobile 0 critical (2 high inside `@expo/cli` tooling).

## 7. Secrets
- No secrets found in source, configs or docs (pattern scan for Atlas URIs, private keys, API keys).
- The local `crm-backend-mongo/.env` and `crm-mobile-expo/.env` contain real local configuration (JWT secrets, Google client id, DB URI). They are **excluded from the release ZIP**. If either file or the original ZIP was shared, **rotate the JWT secrets and database credentials**.

## 8. External services required
| Service | Needed for | Status |
|---|---|---|
| MongoDB | everything | required |
| Google OAuth client | Google sign-in | optional; not live-verified |
| E-mail provider | password-reset delivery, invitations, verification | **not integrated** |
| EAS / Apple / Google developer accounts | native builds & store releases | not available here |
| Redis (optional) | shared rate limits across instances | not integrated |

## 9. Remaining / incomplete
See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md). (Items marked done in the v1.1 addendum below: teams, customer & invoice ownership, reset-password screens, CSV import/export, duplicate detection, lead conversion.) Still open: e-mail delivery, invitations/verification/MFA, bulk actions, invoice PDF/credit notes/reconciliation/GST validation, push notifications, file uploads, offline sync, audit-log viewer, splitting the largest legacy screens, Zod 4 migration, native builds and device testing.

## 10. Commands

```bash
# install
cd crm-backend-mongo && npm ci && cp .env.example .env     # edit .env
cd ../crm-mobile-expo && npm ci && cp .env.example .env    # set EXPO_PUBLIC_API_URL

# upgrade an existing database (after a backup)
cd crm-backend-mongo && npm run migrate

# start
cd crm-backend-mongo && npm run dev
cd crm-mobile-expo && npx expo start

# test
cd crm-backend-mongo && npm run typecheck && npm test && npm run build
cd crm-mobile-expo && npm run typecheck && npm run lint && npm test && npx expo-doctor
```

---

## Addendum — v1.1 "CRM workflows" (2026-11-03)

**Implemented:** teams & territory scoping for managers; customer ownership + sharing; invoice/payment visibility through customers; lead → customer/deal conversion (API + app); duplicate detection on e-mail/phone with override (API + customer form); CSV import/export for leads and customers (API); forgot/reset password screens with deep link; migration backfill for existing data.

**Bugs found and fixed while doing it:** customer API responses had no `id` field; lead e-mails were stored case-sensitively; a phone-normalisation regex error caught by the new unit test before release.

**Verified:** backend typecheck/build, **86/86** backend tests; mobile typecheck, lint, **41/41** tests, Expo Doctor 21/21, web bundle; migration on seeded legacy data; browser E2E of forgot → reset → login → convert lead.

**Still open:** no CSV upload/download UI or customer owner picker in the app; no create-lead form in the app (pre-existing); e-mail delivery not integrated; native builds and devices not tested. Full list: [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

**Upgrade:** back up, deploy, run `npm run migrate`, then check which customers stayed unowned (visible only to OWNER/ADMIN) and assign owners.

---

## Addendum — v1.2 "Team-scoped reports" (2026-11-03)

- **Security fix:** `/ai/next-best-actions` (open to every role) returned company-wide lead names and overdue invoices; it is now limited to the caller's scope. Regression-tested.
- Reports, AI analytics and the manager dashboard now follow team scope for managers who lead teams (OWNER/ADMIN unchanged).
- Verified: backend typecheck/build and **96/96** tests (10 new). The mobile app needed no changes (response shapes unchanged; `teamSize` added).

---

## Addendum — v1.3 "Redesign, motion & visual pipeline" (2026-11-04)

- **Expo Go error fixed:** the app now targets **Expo SDK 58** (your Expo Go version). Dependencies were moved together and the lockfile regenerated; 19 resulting type errors fixed at the root.
- **Redesign:** shared motion/graphics/chart and form kits; rebuilt Login, Register, Forgot/Reset password, Lead, Deal, Task, Customer, Product, Invoice, Payment, Calendar event and Alerts; new Pipeline (kanban/list, weighted forecast, stage moves) and role-aware Analytics. Forms only offer what the role may do; the server still enforces everything.
- **Bugs found during verification:** clipped sign-in card on phones; blank gradient headers on web; lists not refreshing after a save; **an unmigrated database makes every sign-in after the first fail (409)** — the server now repairs this on start; failed sign-ups left a user behind — now rolled back.
- **Removed:** old deals board, in-screen create modals and their handlers, non-functional "Remember me" and Google buttons (~3,500 lines).
- **Verified:** mobile 59/59, backend 97/97, tsc/lint clean, Expo Doctor 20/20, web bundle, browser E2E on a phone viewport. **Not verified:** native builds and a real device on SDK 58.
